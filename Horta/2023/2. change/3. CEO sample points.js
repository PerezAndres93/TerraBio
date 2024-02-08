// -------------------------------------------------------------------------------
// Sample points for CEO validation
// Authors: SIG
// Description:  
//    SIMPLE RANDOM SAMPLE of points in designated land use areas
//      Programmatically adds stratified sampling to get minimum of points per change strata
//      Extract values at each point: strata, all landtrendr bands, land use
//  AFTER THIS - Do CEO validation, then when you have the confusion matrix, 
//                  go to confusion matrix script(s)
// Last updated & by: 2023-05-17 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-05-17: Copied to Horta, started port -dnekorchuk
// -------------------------------------------------------------------------------


/* Sampling Parameters */

// Set seed so that can recreate same points, if needed.
var ptSeed = 7;

// There must be a minimum of 30 points in each category
//    adding 10% (3) points to be safe (in case we have to drop points for any reason)
var minPoints = 33;
print('Min pts per strata', minPoints);

// Carbon calculations require SIMPLE random sampling
//  However, we need a minimum number per change strata
// Multiply total number of strata by 33 & add buffer % to attempt to catch enough on 'initial' phase 
var bufferPerc = 0.05; 
// NOTE: on testing, this was not actually helpful for Cafe Apui, but may in general be helpful on others, so keeping


/* Data imports */ 

//Will be adding land use to sampled points
var gp = require('users/ingperezescobar/TerraBio_final:horta/2023/geometries parameters');
var farms = gp.layers.farms;
//split interventions (Established vs New/Planned)
//var intvPre2019 = gp.layers.interventionsPre2019; // edited by Jorge. This polygon does not exist to Horta
//var intv2019On = gp.layers.interventions2019On; // edited by Jorge. this polygon does not exist to Horta
var interventions = gp.layers.interventions; // added by Jorge. This is Intervention polygon
var counterfactuals = gp.layers.counterfactuals;
var reference = gp.layers.reference;
var farmsUndesignated = gp.layers.farmsUndesignated;

var baseOutFolder = gp.params.baseOutputFolder; // added by Jorge


// *** Update this! *** //
//Create a list of all land uses - update here for different land uses (e.g. Cafe Apui has 2 interventions)
// (do NOT include farms as other land uses are in farms, leading to multiple matches with points)
var landUses = ee.List(
  [// intvPre2019, 
  // intv2019On, 
  interventions,
  counterfactuals, 
  reference, 
  farmsUndesignated]);

//landtrendr
var gain = gp.layers.landtrendr.gain
      .unmask(0); //gain needs 'remapped' 0 unmasked
var loss = gp.layers.landtrendr.loss;
// var gain = gainImg.select('remapped').unmask(0); 
// var loss = lossImg.select('remapped');
var dictionaryGain = gp.params.dictionaryGain; 
var dictionaryLoss = gp.params.dictionaryLoss; 
//Reminder
// var dictionaryGain = ee.Dictionary({
//       0: "NoGain",
//       1: "Gain"
//     });
// var dictionaryLoss = ee.Dictionary({
//         1: "StableForest",
//         2: "Degradation",
//         3: "Deforestation",
//         4: "NonForest"
//     });


var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors 
var paletteLoss = paletteCiat.colors.paletteLoss; 
var paletteGainUnmasked = paletteCiat.colors.paletteGainUnmasked; 
//Reminder
// var paletteLoss = [paletteCiat.colors.colorStableForest, //1, stable forest
//                     paletteCiat.colors.colorDegradation, //2, degradation
//                     paletteCiat.colors.colorDeforestation, //3, deforestation
//                     paletteCiat.colors.colorBackground]; //4, non-forest 
// var paletteGain = [paletteCiat.colors.colorGain]; //1, gain

var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 


/* Random sample points */

//Inital point sampling number
// Loss strata has the most strata at four, so 4 * the minimum number, plus a buffer
//  and round to integer for .randomPoints() input
var iniNumPts = ee.Number(4 * minPoints * (1 + bufferPerc)).round();
print('Inital number of points', iniNumPts); 

// Randomly sample and 
// Add 'initial' to property 'sampling_phase'
// Carbon will use only 'initial' (re Karis conversation 2023-05-12)
//  but need the 'additional' points to fill out strata for error
var randomPoints = ee.FeatureCollection.randomPoints({
  //IF there are land uses outside of farm boundaries, you must have a merged collection here. 
  region: farms,
  points: iniNumPts,
  seed: ptSeed
});

// print(randomPoints);


/* Add gain/loss strata & add more points if needed */

//Clarify band names so can tell them apart after all added
var newLossNames = loss.bandNames()
  .getInfo()
  .map(function(bName){
    return 'loss_' + bName;
});
var newGainNames = gain.bandNames()
  .getInfo()
  .map(function(bName){
    return 'gain_' + bName;
});

loss = loss
  .select(loss.bandNames(), newLossNames);
gain = gain
  .select(gain.bandNames(), newGainNames);
  
//add bands into single image
var allChange = loss.addBands(gain);
//print('allChange', allChange); 


//Add all Landtrendr band values to points
// Note that point will have both gain and loss strata info
//  and can be used for both 

var ptsStrata = allChange.reduceRegions({
  collection: randomPoints, 
  //point data, so using .first()
  reducer: ee.Reducer.first(), 
//carbon calculations need the simple random only, so identify with a property
}).map(function(pt){return pt.set('sampling_phase', 'initial')});


//Count per remapped strata
// Must split into gain / loss for the following
var histoLoss = ptsStrata.aggregate_histogram('loss_remapped'); 
var histoGain = ptsStrata.aggregate_histogram('gain_remapped'); 

//Turn dictionary into feature collection so can manipulate more easily
var fcHistoLoss = ee.FeatureCollection(histoLoss.keys().map(function(k){
  return ee.Feature(null, {key: k, value: histoLoss.getNumber(k)}); 
})); 
var fcHistoGain = ee.FeatureCollection(histoGain.keys().map(function(k){
  return ee.Feature(null, {key: k, value: histoGain.getNumber(k)}); 
})); 

//Function to calculate how many more points needed 
function calcKeysMorePoints(feat){
  //negative values should be zero (no additional points needed)
  var needed = ee.Number(minPoints).subtract(feat.getNumber('value')).max(0);
  return feat.set('needed', needed); 
}

var fcLossMore = fcHistoLoss.map(calcKeysMorePoints); 
var fcGainMore = fcHistoGain.map(calcKeysMorePoints);
print('fcLossMore: Loss points to add', fcLossMore);
print('fcGainMore: Gain points to add', fcGainMore)

//Create list of 'key's (strata) & 'needed'
var lossKeys = fcLossMore.aggregate_array('key')
  //properties are strings so turn into a number
  .map(function (str) {return ee.Number.parse(str)}); 
var gainKeys = fcGainMore.aggregate_array('key')
  //properties are strings so turn into a number
  .map(function (str) {return ee.Number.parse(str)});
  
var lossNeeded = fcLossMore.aggregate_array('needed')
  //properties are strings so turn into a number
  .map(function (str) {return ee.Number.parse(str)});
var gainNeeded = fcGainMore.aggregate_array('needed')
  //properties are strings so turn into a number
  .map(function (str) {return ee.Number.parse(str)});

//Stratified sample to get specific strata and number of points
var moreLossPts = allChange
    .stratifiedSample({
      //from the loss remapped band 
      classBand: 'loss_remapped',
      //required, but overruled with classPoints
      numPoints: minPoints, 
      region: farms,
      scale: 30, 
      //reusing seed
      seed: ptSeed,
      classValues: lossKeys,
      classPoints: lossNeeded,
      //Loss strata are the only important ones  
      dropNulls: true, 
      geometries: true
    })
    .map(function(pt){return pt.set('sampling_phase', 'additional_loss')});

var moreGainPts = allChange
    .stratifiedSample({
      //from the gain remapped band 
      classBand: 'gain_remapped',
      //required, but overruled with classPoints
      numPoints: minPoints, 
      region: farms,
      scale: 30, 
      //reusing seed
      seed: ptSeed,
      classValues: gainKeys,
      classPoints: gainNeeded,
      //Gain strata are the only important ones  
      dropNulls: true, 
      geometries: true
    })
    .map(function(pt){return pt.set('sampling_phase', 'additional_gain')});

// Merge all points together
var addlPoints = moreLossPts.merge(moreGainPts);

var allPoints = ptsStrata.merge(addlPoints); 

/* Add human readable value for gain/loss strata */

var addLossStrataDesc = function(pt){
  var thisDesc = dictionaryLoss.get(pt.get('loss_remapped'));
  return pt.set('loss_desc', thisDesc);
};
allPoints = allPoints.map(addLossStrataDesc); 

var addGainStrataDesc = function(pt){
  var thisDesc = dictionaryGain.get(pt.get('gain_remapped'));
  return pt.set('gain_desc', thisDesc);
};
allPoints = allPoints.map(addGainStrataDesc); 


/* Visualize to see , if wanted */ 

Map.centerObject(farms, 13);
var strataVisLoss = {min:1,max:4,palette:paletteLoss};
Map.addLayer(allChange.select('loss_remapped'), strataVisLoss, 'Loss', false);
Map.addLayer(allChange.select('gain_remapped'), {palette:paletteGainUnmasked}, 'Gain', false);

// Display the outline of boundaries as line with no fill.
// Create an empty image into which to paint the features, cast to byte.
var empty = ee.Image().byte();
// Paint all the polygon edges with the same number and width, display.
//farms
var outlineFarms = empty.paint({
  featureCollection: farms,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms'); 
Map.addLayer(randomPoints, {color: 'blue'}, 'Initial random sample');
Map.addLayer(addlPoints, {color: 'red'}, 'Additional stratified'); 
Map.addLayer(allPoints, {color: 'purple'}, 'All sampled points', false);


/* Add land use names to feature collections */ 

// To make it easier to programmatically extract land use values at points for different point sets, 
//  make a single feature collection with all land use features with a 
//  property 'land_use' as the name of the asset (which should contain the land use name)

// This ASSUMES that the asset name is understandable as a land use, 
//  so be aware if you have unclear asset names. 

//Function for each land use feature collection to add a property of name of object (land use)
function addLuName(fcLu){
  //Recast as Feature Collection
  fcLu = ee.FeatureCollection(fcLu);
  //Get id of fc, which is the path to object
  // and extract just the name after the last slash
  var fcId = fcLu.get('system:id');
  // Split on each slash
  var fcIdSplit = ee.String(fcId).split('/');
  // Take the last one
  var fcName = fcIdSplit.get(-1);

  //for each polygon in the feature collection
  // add the name extracted above as a property
  var fcLuNamed = fcLu.map(function(lcPoly){
    var lcPolyNamed = lcPoly.set({'land_use': fcName});
    return lcPolyNamed;
  });
  
  return fcLuNamed;
}

//Name each polygon and then make one big feature collection
// Doesn't matter the different fields, we only care about 'land_use' here
var luNamedList = landUses.map(addLuName); 
//Global variable for use in the point function below
var allLandUses = ee.FeatureCollection(luNamedList).flatten(); 


/* Extract land use at the points */

// Note that no point is ever in multiple land uses 

// Define a spatial filter as geometries that intersect (actually within in this case). 
var spatialFilter = ee.Filter.intersects({
  leftField: '.geo',
  rightField: '.geo',
  maxError: 10
});
// Define a save all join.
var saveAllJoin = ee.Join.saveAll({
  matchesKey: 'withinPoly',
});


/* Use land use to all points */

// Apply the join.
// Returns points with property withinPoly of the polygon it falls into
var sampledPtsPoly = saveAllJoin.apply(allPoints, allLandUses, spatialFilter);

// Now, add the land_use property of the withinPoly to the point
var sampledPtsLandUse = sampledPtsPoly.map(function(pt){
  //get feature it falls into (returns as list note)
  var polyList = pt.get('withinPoly');
  //This is where it is important point only falls into one polygon
  var polyObj = ee.List(polyList).get(0); 
  //get feature and grab the land_use
  var polyLandUse = ee.Feature(polyObj).get('land_use');
  //return point with new land_use property
  // and remove the withinPoly property (by selecting everything else)
  var ptLu = pt.set('land_use', polyLandUse);
  var ptClean = ptLu.select(
    ptLu.propertyNames().filter(ee.Filter.neq('item', 'withinPoly')));
  
  return ptClean;
});

print('sampled points', sampledPtsLandUse); 

//=====================================================================//
//                     FINAL CHECK                                     //
//=====================================================================//

// Here, we perform a final check that all data needs are met

//----------------------------------------------------------------------
// DATA NEED 1: 35 points in each land use
//----------------------------------------------------------------------
var landUseHisto = sampledPtsLandUse.aggregate_histogram('land_use');
print('Points in each land use',landUseHisto);

//----------------------------------------------------------------------
// DATA NEED 2: 35 points in each loss stratum
//----------------------------------------------------------------------

var lossHisto = sampledPtsLandUse.aggregate_histogram('loss_desc');
print('Points in each loss stratum',lossHisto);

//----------------------------------------------------------------------
// DATA NEED 3: 35 points in each gain stratum, within intervention sites
//----------------------------------------------------------------------

var interventionPts = sampledPtsLandUse.filter(ee.Filter.stringContains('land_use', 'intervention'));
var interventionHisto = interventionPts.aggregate_histogram('gain_desc');
print('Points in each gain stratum, within intervention sites', interventionHisto);



//=============================
// Format for CEO & Export 
//=============================

// CEO-ify the points.
// CEO needs the points in a specific format and as a CSV.

//Need to add and integer id for CEO
// Plan: Renumber system:index and set as PLOTID and SAMPLEID in cleaning function
//number sequence the length of the collection (starting with 0)
var pointsIdList = ee.List.sequence(0,sampledPtsLandUse.size().subtract(1));
//turn fc into list
var pointsList = sampledPtsLandUse.toList(sampledPtsLandUse.size());
//map over the id list, using the value as index to get that image
//  and setting it as the new system index

var idForCeo = function(newIndex){
  var feat = ee.Feature(pointsList.get(newIndex));
  var indexString = ee.Number(newIndex).format('%01d');
  return feat.set('system:index', indexString, 
                  'PLOTID', indexString,
                  'SAMPLEID', indexString);
};
var pointsID = ee.FeatureCollection(pointsIdList.map(idForCeo));

var coordsForCeo = function(f){
  //Need "LON", "LAT" fields for CEO 
  var coords = f.geometry().coordinates(); 
  return f.set('LON', coords.get(0),
              'LAT', coords.get(1)); 
}; 
var ptsCeo = pointsID.map(coordsForCeo); 
print('points to export', ptsCeo);

//"system:index" and ".geo" are not allowed in the CEO csv upload. 
var fieldsExport = ['PLOTID', 'SAMPLEID', 'LON', 'LAT', 
                    // strata, land use
                    'gain_remapped', 'gain_desc', 'loss_remapped', 'loss_desc', 'land_use', 'sampling_phase',
                    //any other landtrendr values present (depends on result)
                    'gain_yod', 'gain_dsnr', 'gain_dur', 'gain_mag', 'gain_preval', 'gain_rate',
                    'loss_yod', 'loss_dsnr', 'loss_dur', 'loss_mag', 'loss_preval', 'loss_rate'];

Export.table.toDrive({
  collection: ptsCeo,
  //"system:index" and ".geo" are not allowed in the CEO csv upload. 
  selectors: fieldsExport, 
  fileNamePrefix: dealName + '_' + reportYear + '_sampledPoints_forCEO',
  description: dealName + '_' + reportYear + '_sampledPoints_forCEO',
  fileFormat: 'CSV'
});

// Also export to asset for easier access for later stand age comparison
var fileName = dealName + '_' + reportYear + '_sampledPoints_forCEO'; 
Export.table.toAsset({
  collection: ptsCeo,
  description: fileName,
  //assetId: baseOutFolder + fileName
  assetId: baseOutFolder + fileName
});


//  AFTER THIS - Do CEO validation, then when you have the confusion matrix, 
//                  go back to 2. change / confusion matrix script(s)


