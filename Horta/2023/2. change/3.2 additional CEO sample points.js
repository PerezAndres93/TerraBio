// -------------------------------------------------------------------------------
// Sample points for CEO validation
// Authors: ?, Dawn Nekorchuk, Vanessa Machuca
// DESCRIPTION  
//    SIMPLE RANDOM SAMPLE of points in designated land use areas
//      Programmatically adds stratified sampling to get minimum of points per change strata
//      Extract values at each point: strata, all change landtrendr bands, land use
//      Samples centroids of pixels in LandTrendR results raster to ensure a minimum distance between points.
//      Generates additional points to supplement 41 interpreted points, using 
//          land use polygons altered to omit 60m by 60m square aroudn those 41 interpreted points
// WORKFLOW:
//      1. Update this script. Control-F "!!!" to find the lines to change
//      2. generate simple random sample within farm boundaries
//      3. Add additional loss points to ensure at least 35 points in each loss stratum
//      4. Check if there are enough gain points in interventions, and generate additional points accordingly
//      5. Check if there are enough points in each land use, and generate additional points accordingly
// FOLLOWING STEPS: Do CEO validation, then when you have the confusion matrix, 
//                  go to confusion matrix script(s)
// Last updated & by: 2023-09-01 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-09-01: Used previous points buffers to generate new points as centroids -vmachuca
//             of pixels in allChange. Mask previously selected pixels.
// 2023-08-23: Initialized, delete idField line in "assignLandUse" function -vmachuca
// 2023-08-23: Finalized script and shared with Jorge -vmachuca
// 2023-08-22: Initiated to establish updated sampling scheme -vmachuca
// 2023-08-07: Generated additional samples to meet remaining data needs and exported these points. -vmachuca
// 2023-08-02: Re-organized, integrated intervention sample into original sample, added point histograms, vmachuca
// 2023-07-12: Added stratified sampling of gain/no gain in intervention sites, vmachuca
// 2023-07-11: Adding piece ensuring that land use keys are strings,dnekorchuk
// 2023-07-05: Added stratified pull on intervention sites and aggregate histograms 
//              to count pixels per land use type, vmachuca
// 2023-06-19: Updated interventions landuse to proper split/filtered collection
// 2023-05-23: Add farm id to points, dnekorchuk
// 2023-05-15: Finished switch to simple random sampling with 
//              programmatic addition for specific strata minimum sample, dnekorchuk
// 2023-05-10: No hardcoded gain/loss links, using geometries parameters module
// 2023-05-03: Merge all sample scripts, adapt to Cafe Apui, by dnekorchuk
// ?: Creation
// -------------------------------------------------------------------------------
// tags (use control-F to jump to tagged places)
// !!! = place to update according to deal
// -------------------------------------------------------------------------------

//Workload tags -dnekorchuk
// var workTags = require('users/an-sig/TerraBio:workload tags');
// ee.data.setDefaultWorkloadTag(workTags.tags.apuiTag);

//===============================================================//
//                  Sampling Parameters                          //
//===============================================================//

// Set seed so that can recreate same points, if needed.
var ptSeed = 7;

// There must be a minimum of 30 points in each category
//    adding 10% (3) points to be safe (in case we have to drop points for any reason)
var minPoints = 33;
//print('Min pts per strata', minPoints);

// Carbon calculations require SIMPLE random sampling
//  However, we need a minimum number per change strata
// Multiply total number of strata by 33 & add buffer % to attempt to catch enough on 'initial' phase 
var bufferPerc = 0.05; 
// NOTE: on testing, this was not actually helpful for Cafe Apui, but may in general be helpful on others, so keeping


//===============================================================//
//                     Data Imports                              //
//===============================================================//

//Will be adding land use to sampled points
var gp = require('users/ingperezescobar/TerraBio_final:horta/2023/geometries parameters');
var farms = gp.layers.farms;
print('farms',farms);
var interventions = gp.layers.interventions;
var interventionsBuffers = gp.layers.interventionsBuffers; //!!! delete this
var counterfactuals = gp.layers.counterfactuals;
var counterfactualBuffers = gp.layers.counterfactuals;
var reference = gp.layers.reference;
var referenceBuffers = gp.layers.referenceBuffers; //!!! delete this
var farmsUndesignated = gp.layers.farmsUndesignated;
var allAreas = gp.layers.allAreas;
print('allAreas',allAreas);
var allAreasBuffers = gp.layers.allAreasBuffers; //!!! delete this
print('allAreasBuffers',allAreasBuffers);

//!!!
// *** Update this according to deal *** //
//Create a list of all land uses - update here if there are any different land uses (e.g. regeneration)
// (do NOT include farms as other land uses are in farms, leading to multiple matches with points)
// Note that ALL land uses must have a field that specifies the farm ID (or change code below)
var landUses = ee.List(
  [interventions, 
  counterfactuals, 
  reference, 
  farmsUndesignated]);

//landtrendr
var gain = gp.layers.landtrendr.gain
      .unmask(0); //gain needs 'remapped' 0 unmasked
var loss = gp.layers.landtrendr.loss;


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


var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 
var baseOutFolder = gp.params.baseOutputFolder;

//===============================================================//
//                     Functions                                 //
//===============================================================//

////////////////////////////////////////////////////////////////////
// function for assinging land use information to sample points

// NOTE: no point is ever in multiple land uses 
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

var assignLandUse = function(pt){
  //get feature it falls into (returns as list note)
  var polyList = pt.get('withinPoly');
  //This is where it is important point only falls into one polygon
  var polyObj = ee.List(polyList).get(0); 
  //get feature and grab the land_use and farm Codigo
  var polyLandUse = ee.Feature(polyObj).get('land_use');
  //var polyFarmID = ee.Feature(polyObj).get(idField);
  //return point with new properties
  var ptLu = pt.set('land_use', polyLandUse);
                    //'farm_id', polyFarmID);
  // and remove the withinPoly property (by selecting everything else)
  var ptClean = ptLu.select(
    ptLu.propertyNames().filter(ee.Filter.neq('item', 'withinPoly')));
  
  return ptClean;
}

////////////////////////////////////////////////////////////////////
//Function to calculate how many more points needed 

function calcKeysMorePoints(feat){
  //negative values should be zero (no additional points needed)
  var needed = oneNumPts.subtract(feat.getNumber('value')).max(0);
  return feat.set('needed', needed); 
}

////////////////////////////////////////////////////////////////////
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

  //for each polygon in the feature collection add the name extracted above as a property
  var fcLuNamed = fcLu.map(function(lcPoly){
    var lcPolyNamed = lcPoly.set({'land_use': fcName});
    return lcPolyNamed;
  });
  
  return fcLuNamed;
}
////////////////////////////////////////////////////////////////////
//Function to ensure that "gain_remapped" and "loss_remapped" have the same value type

function valueType(pt){
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      return pt.set('gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString);
}

//===============================================================//
//       Add land use names to feature collection                //
//===============================================================//

// To make it easier to programmatically extract land use values at points for different point sets, 
//  make a single feature collection with all land use features with a 
//  property 'land_use' as the name of the asset (which should contain the land use name)
// This ASSUMES that the asset name is understandable as a land use, 
//  so be aware if you have unclear asset names. 

//Name each polygon and then make one big feature collection
// Doesn't matter the different fields, we only care about 'land_use' and idField ('Codigo') here
var luNamedList = landUses.map(addLuName); 
//Global variable for use in the point function below
var allLandUses = ee.FeatureCollection(luNamedList).flatten(); 
//Map.addLayer(allLandUses,{},'All Land Uses')

//===============================================================//
//               Prepare loss/gain strata                        //
//===============================================================//

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

allChange = allChange.unmask(); //remove masks

//===============================================================//
//                      Sample Grid                              //
//===============================================================//

//Ensures that all points sampled will now be centroids of the pixels in this grid.

//this should align with Landsat, given that we take the projection from LandTrendR results
var proj = allChange.projection(); //EPSG:4325 - WGS84
// Display the pixel grid assocaited with a projection, as box outlines.
var displayGrid = function(proj) {
  // Scale by 2 because we have 2 zero crossings when using round.
  var cells = ee.Image.pixelCoordinates(proj.scale(2,2));
  return cells.subtract(cells.round()).zeroCrossing().reduce('sum').selfMask();
};
Map.addLayer(displayGrid(proj));


//now modify allChange 
allChange = allChange.addBands(ee.Image.pixelLonLat());

//===============================================================//
//        Step 1: Initial Simple Random Sample                   //
//===============================================================//


//Inital point sampling number
// Loss strata has the most strata at four, so 4 * the minimum number, plus a buffer
//  and round to integer for .randomPoints() input - 139
var iniNumPts = ee.Number(4 * minPoints * (1 + bufferPerc)).round();
//print('iniNumPts',iniNumPts);

//number of points necessary per category - 35
var oneNumPts = ee.Number(minPoints * (1 + bufferPerc)).round();

// Randomly sample within farm and add 'initial' to property 'sampling_phase'
var randomPoints = allChange
  .sample({
    region: allAreasBuffers,
    projection: proj, //set to projection defined above
    numPixels: iniNumPts,
    tileScale: 8,
    seed: ptSeed,
    dropNulls: true
  });
//print('randomPoints',randomPoints);


//adds geometries to all the points
randomPoints = randomPoints.map(function(f) {
  return f.setGeometry(ee.Geometry.Point([f.getNumber('longitude'), f.getNumber('latitude')]))
});


//Add all Landtrendr band values to points
// Note that point will have both gain and loss strata info
//  and can be used for both 

var allPoints = allChange.reduceRegions({
  collection: randomPoints, 
  //point data, so using .first()
  reducer: ee.Reducer.first(), 
//carbon calculations need the simple random only, so identify with a property
}).map(function(pt){return pt.set('sampling_phase', 'initial')});


Map.centerObject(farms, 15);

//Map.addLayer(allPoints, {color: 'blue'}, 'randomPoints', true);

//* mask allChange  *//  
//this ensures that the same points won't be selected in the future

var pointMask = ee.Image.constant(1).clip(allPoints.geometry()).mask().not();
allChange = allChange.updateMask(pointMask);


//===============================================================//
//     Step 2: Loss Points within Farm Boundaries                //
//===============================================================//

// DESCRIPTION: Count points needed for each loss stratum and 
//              add onto intial sample using stratified sampling
// METRIC: conserved forest area
// DATA NEED: 35 points per loss stratum within farm boundaries, excluding intervention sites
//            - we will include intervention sites for simplicity 
// LOSS STRATA: stable forest, degradation, deforestation, non-forest 

// CHECK:

//empty loss strata dictionary
var lossDict = ee.Dictionary({
  1: 0,
  2: 0,
  3: 0,
  4: 0
});

//Count per loss stratum
var histoLossRaw = allPoints.aggregate_histogram('loss_remapped'); 
var histoLoss = lossDict.combine(histoLossRaw,true); 
print('CHECK: loss points', histoLoss); 

//*********************************************************************
//!!! If there are at least 35 points within each loss stratum, comment out
// everything below and up to "Step 3: Gain Points Within Intervention Sites"
//*********************************************************************

//Turn dictionary into feature collection so can manipulate more easily
var fcHistoLoss = ee.FeatureCollection(histoLoss.keys().map(function(k){
  return ee.Feature(null, {key: k, value: histoLoss.getNumber(k)}); 
})); 

var fcLossMore = fcHistoLoss.map(calcKeysMorePoints); 

//Create list of 'key's (strata) & 'needed'
var lossKeys = fcLossMore.aggregate_array('key')
  //properties are strings so turn into a number
  .map(function (str) {return ee.Number.parse(str)}); 

var lossNeeded = fcLossMore.aggregate_array('needed')
  //properties are strings so turn into a number
  .map(function (str) {return ee.Number.parse(str)});
//print('lossNeeded',lossNeeded);



var moreLossPts = allChange
    .stratifiedSample({
      //from the gain remapped band 
      classBand: 'loss_remapped',
      //required, but overruled with classPoints
      numPoints: oneNumPts, 
      region: allAreasBuffers,
      projection: proj,
      scale: 30, 
      //reusing seed
      seed: ptSeed,
      classValues: lossKeys,
      classPoints: lossNeeded,
      dropNulls: false, 
      geometries: true
    })
    .map(function(pt){
      //fixing some apparent weirdness with value types (errors in histogram)
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'additional_loss', 'loss_remapped', lossRemappedString, 'gain_remapped', gainRemappedString)});

//print('moreLossPts',moreLossPts);
//Map.addLayer(moreLossPts, {color: 'red'}, 'moreLossPoints', true);

//merge additional loss points with initial random points
allPoints = allPoints.merge(moreLossPts).map(valueType);

//print('allPoints',allPoints);

/*  update mask  */
pointMask = ee.Image.constant(1).clip(moreLossPts.geometry()).mask().not();
allChange = allChange.updateMask(pointMask);


// ===============================================================//
//     Step 3: Gain Points Within Intervention Sites             //
// ===============================================================//

//METRIC: regenerated/reforested area within intervention sites
//DATA NEED: 35 points gain stratum (gain, no gain) within intervention sites

//empty gain strata dictionary
var gainDict = ee.Dictionary({
  0: 0,
  1: 0,
});

// add the land_use property to sample points
var sampledPtsPoly = saveAllJoin.apply(allPoints, allLandUses, spatialFilter);
var sampledPtsLandUse = sampledPtsPoly.map(assignLandUse);

//Count gain stratum within intervention sites
var samplesIntervention = sampledPtsLandUse.filter(ee.Filter.stringContains('land_use', 'intervention'));
var histoGainRaw = samplesIntervention.aggregate_histogram('gain_remapped')
var histoGain = gainDict.combine(histoGainRaw,true); 
print('CHECK: gain points in intervention sites', histoGain); 

// //*********************************************************************
// //!!! If there are at least 35 points within each gain stratum, comment out
// // everything below and up to  "Step 4: Land Use Points"
// //*********************************************************************

//Turn dictionary into feature collection so can manipulate more easily
var fcHistoGain = ee.FeatureCollection(histoGain.keys().map(function(k){
  return ee.Feature(null, {key: k, value: histoGain.getNumber(k)}); 
})); 

var fcGainMore = fcHistoGain.map(calcKeysMorePoints); 

//Create list of 'key's (strata) & 'needed'
var gainKeys = fcGainMore.aggregate_array('key')
  //properties are strings so turn into a number
  .map(function (str) {return ee.Number.parse(str)}); 

  
var gainNeeded = fcGainMore.aggregate_array('needed')
  //properties are strings so turn into a number
  .map(function (str) {return ee.Number.parse(str)});


var moreGainPts = allChange
    .stratifiedSample({
      //from the gain remapped band 
      classBand: 'gain_remapped',
      //required, but overruled with classPoints
      numPoints: oneNumPts, 
      region: interventionsBuffers,
      scale: 30, 
      //reusing seed
      seed: ptSeed,
      classValues: gainKeys,
      classPoints: gainNeeded,
      dropNulls: false, 
      geometries: true
    })
    .map(function(pt){
      //fixing some apparent weirdness with value types (errors in histogram)
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'additional_gain', 'loss_remapped', lossRemappedString, 'gain_remapped', gainRemappedString)});


var histoMoreGain = moreGainPts.aggregate_histogram('gain_remapped'); 
print('histogram: moreGain', histoMoreGain);

//merge additional gain points into sample
allPoints = moreGainPts.merge(allPoints);
//print('addlPts',allPoints);

//Map.addLayer(moreGainPts,{color:'green'},'moreGainPts',true);

/*  update mask  */
pointMask = ee.Image.constant(1).clip(moreGainPts.geometry()).mask().not();
allChange = allChange.updateMask(pointMask);


//===============================================================//
//                 Step 4: Land Use Points                       //
//===============================================================//

// METRIC: carbon sequestration - emission reduction
// DATA NEED: 35 points per land use


//generate empty land use category dictionary

var keysLandUse = luNamedList.map(function(fcLu){ //list of land use names
  //Recast as Feature Collection
  fcLu = ee.FeatureCollection(fcLu);
  //Get id of fc, which is the path to object
  // and extract just the name after the last slash
  var fcId = fcLu.get('system:id');
  // Split on each slash
  var fcIdSplit = ee.String(fcId).split('/');
  // Take the last one
  var fcName = fcIdSplit.get(-1);
  return fcName;
  });
var valuesLandUse = ee.List.repeat(0, keysLandUse.size());
var landUseDict = ee.Dictionary.fromLists(keysLandUse, valuesLandUse);

// add the land_use property to sample points
var sampledPtsPoly = saveAllJoin.apply(allPoints, allLandUses, spatialFilter);
var sampledPtsLandUse = sampledPtsPoly.map(assignLandUse);

var histoLandUseRaw = sampledPtsLandUse.aggregate_histogram('land_use'); 
var histoLandUse = landUseDict.combine(histoLandUseRaw,true); 
print('CHECK: points in each land use', histoLandUse); 


//*********************************************************************
//!!! If there are at least 35 points within each gain stratum, comment out
// everything below and up to "add land use info and human-readable gain/loss values"
//*********************************************************************

// This part will require some troubleshooting. Use "histoLandUse" to determine 
// which land uses need additional points. 
// IF only one land use needs additional points:
//     THEN just change the "landUseNeeded"

///!!! change the "landUseNeeded" value depending on how many additional points are needed
var referenceNeeded = 30; 
var counterfactualNeeded = 21; 

var counterfactualPts = allChange //!!!comment out if no more counterfactual points needed
  .sample({
    region: counterfactuals,
    projection: proj, //set to projection defined above
    numPixels: counterfactualNeeded,
    tileScale: 8,
    seed: ptSeed,
    dropNulls: true
  });

var referencePts = allChange //!!!comment out if not more counterfactual points needed
  .sample({
    region: referenceBuffers,
    projection: proj, //set to projection defined above
    numPixels: referenceNeeded,
    tileScale: 8,
    seed: ptSeed,
    dropNulls: true
  });


var moreLandUsePts = counterfactualPts.merge(referencePts);
//var moreLandUsePts = counterfactualPts; //!!!uncomment if only additional counterfactual points needed
//var moreLandUsePts = counterfactualPts; //!!!uncomment if only additional reference points needed

moreLandUsePts = moreLandUsePts.map(function(f) {
  return f.setGeometry(ee.Geometry.Point([f.getNumber('longitude'), f.getNumber('latitude')]))
});

moreLandUsePts = allChange.reduceRegions({
  collection: moreLandUsePts, 
  //point data, so using .first()
  reducer: ee.Reducer.first(), 
})
.map(function(pt){
      //fixing some apparent weirdness with value types (errors in histogram)
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'more_landuse', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString)})

//merge additional gain points into sample
allPoints = allPoints.merge(moreLandUsePts);
//print('allPoints',allPoints);

//Map.addLayer(moreLandUsePts,{color: 'yellow'},'more land use points',true);

//===============================================================//
//     add land use info and human-readable gain/loss values     //
//===============================================================//


// add the land_use property to sample points
var sampledPtsPoly = saveAllJoin.apply(allPoints, allLandUses, spatialFilter);
var sampledPtsLandUse = sampledPtsPoly.map(assignLandUse);


//add human-readable values for loss strata
var addLossStrataDesc = function(pt){
  var thisDesc = dictionaryLoss.get(pt.get('loss_remapped'));
  return pt.set('loss_desc', thisDesc);
};
var samplePoints = sampledPtsLandUse.map(addLossStrataDesc); 

//add human-readable values for gain strata
var addGainStrataDesc = function(pt){
  var thisDesc = dictionaryGain.get(pt.get('gain_remapped'));
  return pt.set('gain_desc', thisDesc);
};
var finalSamplePoints = samplePoints.map(addGainStrataDesc); 

print('finalSamplePoints',finalSamplePoints);


//=====================================================================//
//                     FINAL CHECK                                     //
//=====================================================================//

// Here, we perform a final check that all data needs are met

//----------------------------------------------------------------------
// DATA NEED 1: 35 points in each loss stratum
//----------------------------------------------------------------------

var lossHisto = finalSamplePoints.aggregate_histogram('loss_desc');
print('FINAL: Points in loss strata',lossHisto);

//----------------------------------------------------------------------
// DATA NEED 2: 35 points in each gain stratum, within intervention sites
//----------------------------------------------------------------------

var interventionPts = finalSamplePoints.filter(ee.Filter.stringContains('land_use', 'intervention'));
var interventionHisto = interventionPts.aggregate_histogram('gain_desc');
print('FINAL: Points in each gain stratum, within intervention sites', interventionHisto);

//----------------------------------------------------------------------
// DATA NEED 3: 35 points in each land use
//----------------------------------------------------------------------
var landUseHisto = finalSamplePoints.aggregate_histogram('land_use');
print('FINAL: Points in each land use',landUseHisto);

// //===============================================================//
// //                      Visualize                                //
// //===============================================================//

// Map.centerObject(farms, 15);
var strataVisLoss = {min:1,max:4,palette:paletteLoss};
Map.addLayer(allChange.select('loss_remapped'), strataVisLoss, 'Loss', false);
Map.addLayer(allChange.select('gain_remapped'), {palette:paletteGainUnmasked}, 'Gain', false);
Map.addLayer(allChange.select('loss_yod'), strataVisLoss, 'Loss yod', false);
Map.addLayer(allChange.select('gain_yod'), {palette:paletteGainUnmasked}, 'Gain yod', false);


var empty = ee.Image().byte();
// Paint all the polygon edges with the same number and width, display.

//allAreasBuffers
var outlineallAreasBuffers = empty.paint({
  featureCollection: allAreasBuffers,
  color: 1,
  width: 2
});
Map.addLayer(outlineallAreasBuffers, {palette: 'pink'}, 'allAreasBuffers', false); 


//farms
var outlineFarms = empty.paint({
  featureCollection: farms,
  color: 1,
  width: 2
});
//Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms', false); 

//interventions
var outlineInterventions = empty.paint({
  featureCollection: interventionsBuffers,
  color: 1,
  width: 2
});
Map.addLayer(outlineInterventions, {palette: paletteCiat.colors.colorIntervention}, 'Interventions', false);

//counterfactuals
var outlineCounterfactuals = empty.paint({
  featureCollection: counterfactuals,
  color: 1,
  width: 2
});
//Map.addLayer(outlineCounterfactuals, {palette: paletteCiat.colors.colorCounterfactuals}, 'Counterfactuals', false); 

//reference
var outlineReference = empty.paint({
  featureCollection: referenceBuffers,
  color: 1,
  width: 2
});
//Map.addLayer(outlineReference, {palette: paletteCiat.colors.colorReference}, 'Reference', false); 

//undesignated
var outlineUndesignated = empty.paint({
  featureCollection: farmsUndesignated,
  color: 1,
  width: 2
});
//Map.addLayer(outlineUndesignated, {palette: paletteCiat.colors.colorFarmsUndesignated}, 'farmsUndesignated', false); 


//sample points
//Map.addLayer(finalSamplePoints, {color: 'white'}, 'finalSamplePoints', false);



//===============================================================//
//               Format for CEO and Export                       //
//===============================================================//
var sampledPoints = finalSamplePoints;

// CEO needs the points in a specific format and as a CSV.

//Need to add an integer id for CEO
// Plan: Renumber system:index and set as PLOTID and SAMPLEID in cleaning function
//number sequence the length of the collection (starting with 0)
var pointsIdList = ee.List.sequence(0,sampledPoints.size().subtract(1));
//turn fc into list
var pointsList = sampledPoints.toList(sampledPoints.size());
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



//"system:index" and ".geo" are not allowed in the CEO csv upload. 
var fieldsExport = ['PLOTID', 'SAMPLEID', 'LON', 'LAT', 
                    // main strata info
                    'gain_remapped', 'gain_desc', 'loss_remapped', 'loss_desc', 'sampling_phase',
                    //land use and associated farm
                    'land_use', 'farm_id',
                    //any other landtrendr values present (depends on result)
                    'gain_yod', 'gain_dsnr', 'gain_dur', 'gain_mag', 'gain_preval', 'gain_rate',
                    'loss_yod', 'loss_dsnr', 'loss_dur', 'loss_mag', 'loss_preval', 'loss_rate'];


Export.table.toDrive({
  collection: ptsCeo,
  //"system:index" and ".geo" are not allowed in the CEO csv upload. 
  selectors: fieldsExport, 
  fileNamePrefix: dealName + '_' + reportYear + '_samplePoints_forCEO_seed' + ptSeed + '_2023xxxx', 
  description: dealName + '_' + reportYear + '_samplePoints_forCEO_seed' + ptSeed + '_2023xxxx',  
  fileFormat: 'CSV'
});

