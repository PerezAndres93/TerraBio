// -------------------------------------------------------------------------------
// Sample points for CEO validation
// Authors: ?, Dawn Nekorchuk, Vanessa Machuca
// DESCRIPTION  
//    SIMPLE RANDOM SAMPLE of points in designated land use areas
//      Programmatically adds stratified sampling to get minimum of points per change strata
//      Extract values at each point: strata, all change landtrendr bands, land use
//      Restructured/standardized for future use
// OUTLINE:
//      1. generate simple random sample within farm boundaries
//      2. add additional loss points to ensure at least 35 pts. in each loss stratum
//      3. check if there are enough gain points in interventions, and generate additional points accordingly
//      4. check if there are enough points in each land use, and generate additional points accordingly
// FOLLOWING STEPS: Do CEO validatsion, then when you have the confusion matrix, 
//                  go to confusion matrix script(s)
// Last updated & by: 2023-11-20 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2024-01-04: Added an export of existing CEO points with farm no farm label -cwespestad 
// 2024-01-02: Added a farm_no_farm binary layer to label which points are outside the legal farm boundary -cwespestad 
// 2023-11-20: -vmachuca
// 2023-11-14: Added pixel counts. From 3.4 in Cafe Apui.  -vmachuca
// 2023-11-06: Changed LU sampling to match initial random sampling, using projectoin -vmachuca
// 2023-11-03: Copied "3.3 CEO sample points - gridded" from Café Apui year 1 -vmachuca 
//             Regenerate seed at each step by setting ptSeed = ptSeed + 1
//             Added mask so points previously chosen cannot be chosen again
//             Applied valueType function after each step to ensure aggregate histogram works
//             Added projection parameter to stratified random samples (steps 2 and 3)
// ?: Creation
// -------------------------------------------------------------------------------
// tags (use control-F to jump to tagged places)
// !!! = place to update according to deal
// -------------------------------------------------------------------------------

//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.hortaTag);

//===============================================================//
//                  Sampling Parameters                          //
//===============================================================//

// Set seed so that can recreate same points, if needed.
var ptSeed = 10;
var initialPtSeed = ptSeed;

// There must be a minimum of 30 points in each category
//    adding 10% (3) points to be safe (in case we have to drop points for any reason)
var minPoints = 33; //originally 33, but increased to make up for issues with points OUTSIDE of land use polygons being chosen
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
var gp = require('users/ingperezescobar/TerraBio_final:horta/2024/geometries parameters');
var farms = gp.layers.farms;
var interventions = gp.layers.interventions;
var counterfactuals = gp.layers.counterfactuals;
var reference = gp.layers.reference;
var farmsUndesignated = gp.layers.farmsUndesignatedNew;
var allAreas = gp.layers.allAreas;
var regeneration = gp.layers.regeneration;
var aoi = gp.layers.aoi;



//!!!
// *** Update this according to deal *** //
//Create a list of all land uses - update here if there are any different land uses (e.g. regeneration)
// (do NOT include farms as other land uses are in farms, leading to multiple matches with points)
// Note that ALL land uses must have a field that specifies the farm ID (or change code below)
var landUses = ee.List(
  [interventions, 
  counterfactuals, 
  reference, 
  regeneration,
  farmsUndesignated]);

//landtrendr
var gain = gp.layers.landtrendr.gain
      .unmask(0); //gain needs 'remapped' 0 unmasked
var loss = gp.layers.landtrendr.loss;
print('loss projection:', loss.projection());


//Adding a binary mask to extract whether an area is inside or outside the farm
var farm_bounds_img = ee.Image(1).clip(farms).rename('in_farm')
var aoi_img = loss.select('remapped').where(loss.select('remapped').gte(0),2).rename('in_farm')
print('aoi projection:', aoi_img.select('in_farm').projection());
var farm_no_farm = aoi_img.where(farm_bounds_img.eq(1),1).rename('in_farm')
//Map.addLayer(farm_no_farm,{},'farm_no_farm')

var dictionaryGain = gp.params.dictionaryGain; 
var dictionaryLoss = gp.params.dictionaryLoss; 

//substrata distionary
var dictionary_loss_then_gain = ee.Dictionary({
    10: "StableForest NoGain",
    11: "StableForest Gain",
    20: "Degradation NoGain",
    21: "Degradation Gain",
    30: "Deforestation NoGain",
    31: "Deforestation Gain",
    40: "NonForest NoGain",
    41: "NonForest Gain",
});


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
//add human-readable values for farm or not-farm strata
//var dictionaryFarm = ee.Dictionary({
//       2: "NotInFarm",
//       1: "InFarm"
//     });


var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors 
var paletteLoss = paletteCiat.colors.paletteLoss; 
var paletteGainUnmasked = paletteCiat.colors.paletteGainUnmasked; 


var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 
var baseOutFolder = gp.params.baseOutputFolder;

var idField = gp.params.idField; 



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
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      return pt.set('gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString, 'loss_then_gain', loss_then_gain_RemappedString)}

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

//+++++++++++++++++++++++++++++++++++++++++++++
// !*! testing, based on "3.4 CEO_sampling_and_pixel_counts" from Horta year 2
//+++++++++++++++++++++++++++++++++++++++++++++ 
  

loss = loss
  .select(loss.bandNames(), newLossNames);
gain = gain
  .select(gain.bandNames(), newGainNames);
  
  
loss = loss
  .select(loss.bandNames(), newLossNames);
print('loss print',loss)
gain = gain
  .select(gain.bandNames(), newGainNames);
print('gain print',gain)  

var loss_gain = loss.select('loss_remapped').multiply(10).add(gain.select('gain_remapped')).rename('loss_then_gain')


//add a band with all ones, so that the stratified samples act like random samples. we have to use
//stratified sampling to ensure the exact number of points we need is selected.
var oneBand = loss.select('loss_remapped').multiply(0).add(1).rename('ones');

//add bands into single image
var allChange = loss.addBands(gain).addBands(loss_gain).addBands(oneBand).addBands(farm_no_farm);
print('allChange', allChange); 


//+++++++++++++++++++++++++++++++++++++++++++++
// ^^^^ !*! testing, based on "3.4 CEO_sampling_and_pixel_counts" from Horta year 2
//+++++++++++++++++++++++++++++++++++++++++++++ 
  
//add bands into single image
//var allChange = loss.addBands(gain); //!*! uncomment if testing above is fruitless
//print('allChange', allChange); 

allChange = allChange.unmask(); //remove masks
var allChange_simple = allChange
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

//now modify allChange 
allChange = allChange.addBands(ee.Image.pixelLonLat()); 


//===============================================================//
//                pixelate land use polygons                      //
//===============================================================//
// from https://gis.stackexchange.com/questions/456634/calculate-the-area-of-individual-pixels-after-clipping-an-image-to-a-region-of-i

// This will ensure that pixels sampled within a certain land use are at least 50%
//  within that land use polygon. We generate and image of 1', then clip to the 
//  land use polygon, which automatically assigns percentages to each pixel indicating
//  the fraction of pixel area within the polygon. Then mask pixels with value ≤0.5.

//var availablePixels = function(img){return img.mask(img.mask().gte(0.5)).reproject(proj)};
// var availablePixels = function(fc){
//   var img = ee.Image(1).clip(fc);
//   return img.mask(img.mask().gte(0.5)).reproject(proj);
// };

var interventionSampleArea = ee.Image(1).clip(interventions);
interventionSampleArea = interventionSampleArea.mask(interventionSampleArea.mask().gt(0.5)).reproject(proj);

var referenceSampleArea = ee.Image(1).clip(reference);
referenceSampleArea = referenceSampleArea.mask(referenceSampleArea.mask().gt(0.5)).reproject(proj);

var counterfactualSampleArea = ee.Image(1).clip(counterfactuals);
counterfactualSampleArea = counterfactualSampleArea.mask(counterfactualSampleArea.mask().gt(0.5)).reproject(proj);

var regenerationSampleArea = ee.Image(1).clip(regeneration);
regenerationSampleArea = regenerationSampleArea.mask(regenerationSampleArea.mask().gt(0.5)).reproject(proj);


var undesignatedSampleArea = ee.Image(1).clip(farmsUndesignated);
undesignatedSampleArea = undesignatedSampleArea.mask(undesignatedSampleArea.mask().gt(0.5)).reproject(proj);

// Map.addLayer(interventionSampleArea,{},'available intervention pixels', false);
// Map.addLayer(referenceSampleArea,{},'available reference pixels', false);
// Map.addLayer(counterfactualSampleArea,{},'available counterfactual pixels', false);
// Map.addLayer(undesignatedSampleArea,{},'available undesignated pixels', false);

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
    region: allAreas,
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


//* mask allChange  *//  
//this ensures that the same points won't be selected in the future

var pointMask = ee.Image.constant(1).clip(allPoints.geometry()).mask().not();
allChange = allChange.updateMask(pointMask);

//print('allPoints',allPoints);

//===============================================================//
//     Step 2: Loss Points within Farm Boundaries                //
//===============================================================//

// DESCRIPTION: Count points needed for each loss stratum and 
//              add onto intial sample using stratified sampling
// METRIC: conserved forest area
// DATA NEED: 35 points per loss stratum within farm boundaries, excluding intervention sites
//            - we include intervention sites for simplicity 
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
//print('CHECK: loss points', histoLoss); 

//*********************************************************************
//!!! If there are at least 35 points within each loss stratum, comment out
// everything below and up to "Step 3: Gain Points Within Intervention Sites"
//*********************************************************************

ptSeed = ptSeed +1;

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
print('allChange',allChange);
var moreLossPts = allChange
    .stratifiedSample({
      //from the gain remapped band 
      classBand: 'loss_remapped',
      //required, but overruled with classPoints
      numPoints: oneNumPts, 
      region: allAreas,
      scale: 30, 
      projection: proj,
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
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'additional_loss', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString, 'loss_then_gain', loss_then_gain_RemappedString)});

//merge additional loss points with initial random points
var allPoints = moreLossPts.merge(allPoints).map(valueType);
// print('allPoints - after additional loss',allPoints);

//CHECK
var histoLossRaw = allPoints.aggregate_histogram('loss_remapped'); 
var histoLoss = lossDict.combine(histoLossRaw,true); 
//print('CHECK: loss points after addition', histoLoss); 

/*  update mask  */
pointMask = ee.Image.constant(1).clip(moreLossPts.geometry()).mask().not();
allChange = allChange.updateMask(pointMask);

//print('allPoints',allPoints);

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
//print('CHECK: gain points in intervention sites', histoGain); 

//*********************************************************************
//!!! If there are at least 35 points within each gain stratum, comment out
// everything below and up to  "Step 4: Land Use Points"
//*********************************************************************

ptSeed = ptSeed + 1;

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
//print('gainNeeded',gainNeeded);

//mask allChange
var allChangeMasked = allChange.updateMask(interventionSampleArea);
//Map.addLayer(allChangeMasked,{},'masked allChange');

var moreGainPts = allChangeMasked
    .stratifiedSample({
      //from the gain remapped band 
      classBand: 'gain_remapped',
      //required, but overruled with classPoints
      numPoints: oneNumPts, 
      region: interventions,
      scale: 30, 
      projection: proj,
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
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'additional_gain', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString, 'loss_then_gain', loss_then_gain_RemappedString)});


//Map.addLayer(moreGainPts, {color: 'pink'}, 'additional intervention points', false);

//CHECK
var histoMoreGain = moreGainPts.aggregate_histogram('gain_remapped'); 
//print('histogram: moreGain', histoMoreGain);
//!*! only 1 gain point

//merge additional gain points into sample
var allPoints = moreGainPts.merge(allPoints).map(valueType);
//print('addlPts',allPoints);

// //gain points within intervention
// var gainInterv = moreGainPts.filter(ee.Filter.eq('gain_remapped', 1))
// print('gainInterv',gainInterv);

/*  update mask  */
pointMask = ee.Image.constant(1).clip(moreGainPts.geometry()).mask().not();
allChange = allChange.updateMask(pointMask);

//print('allPoints',allPoints);

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

//This part will require some troubleshooting. Use "histoLandUse" to determine 
// which land uses need additional points. 
// IF only one land use needs additional points:
//    THEN just change the "landUseNeeded"


///!!! change the "landUseNeeded" value depending on how many additional points are needed

//////////////////////////COUNTERFACTUAL///////////////////////////////////
ptSeed = ptSeed + 1;
var counterfactualNeeded = 26;
//print('additional counterfactual points needed',counterfactualNeeded);

//mask allChange
allChangeMasked = allChange.updateMask(counterfactualSampleArea);
//Map.addLayer(allChangeMasked,{},'masked allChange');
print('allChangeMasked',allChangeMasked);

var moreCounterfactual = allChangeMasked
    .stratifiedSample({
      classBand: 'ones',
      numPoints: counterfactualNeeded, 
      region: counterfactuals,
      scale: 30, 
      projection: proj,
      seed: ptSeed,
      dropNulls: false, 
      geometries: true
    })
    .map(function(pt){
      //fixing some apparent weirdness with value types (errors in histogram)
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'additional_counterfactual', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString, 'loss_then_gain', loss_then_gain_RemappedString)})
    .limit(counterfactualNeeded);

//print('moreCounterfactual',moreCounterfactual);

//Map.addLayer(moreCounterfactual, {color: 'purple'}, 'additional counterfactual points', false);

//merge additional gain points into sample
var allPoints = moreCounterfactual.merge(allPoints).map(valueType);
//print('allPoints',allPoints);


//* mask allChange  *//  
//this ensures that the same points won't be selected in the future

var pointMask = ee.Image.constant(1).clip(allPoints.geometry()).mask().not();
allChange = allChange.updateMask(pointMask);


// ///////////////////////////REFERENCE//////////////////////////////////
ptSeed = ptSeed + 1;
var referenceNeeded = 28;
//print('additional reference points needed',referenceNeeded);


//mask allChange
allChangeMasked = allChange.updateMask(referenceSampleArea);
//Map.addLayer(allChangeMasked,{},'masked allChange');

var moreReference= allChangeMasked
    .stratifiedSample({
      classBand: 'ones',
      numPoints: referenceNeeded, 
      region: reference,
      scale: 30, 
      projection: proj,
      seed: ptSeed,
      dropNulls: false, 
      geometries: true
    })
    .map(function(pt){
      //fixing some apparent weirdness with value types (errors in histogram)
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'additional_reference', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString, 'loss_then_gain', loss_then_gain_RemappedString)})
    .limit(referenceNeeded);

//print('moreReference',moreReference);

//Map.addLayer(moreReference, {color: 'orange'}, 'additional reference points', false);

//merge additional gain points into sample
var allPoints = moreReference.merge(allPoints).map(valueType);

//* mask allChange  *//  
//this ensures that the same points won't be selected in the future

var pointMask = ee.Image.constant(1).clip(allPoints.geometry()).mask().not();
allChange = allChange.updateMask(pointMask);


// ===============================================================//
//     add land use info and human-readable gain/loss values     //
// ===============================================================//

//print('allPoints',allPoints);

// add the land_use property to sample points
var sampledPtsPoly = saveAllJoin.apply(allPoints, allLandUses, spatialFilter);
//print('sampledPtsPoly',sampledPtsPoly);

var sampledPtsLandUse = sampledPtsPoly.map(assignLandUse);

//add human-readable values for loss/gain strata
var addLossStrataDesc = function(pt){
  var thisDesc = dictionaryLoss.get(pt.get('loss_remapped'));
  return pt.set('loss_desc', thisDesc);
};
var samplePoints = sampledPtsLandUse.map(addLossStrataDesc); 

var addGainStrataDesc = function(pt){
  var thisDesc = dictionaryGain.get(pt.get('gain_remapped'));
  return pt.set('gain_desc', thisDesc);
};
var finalSamplePoints = samplePoints.map(addGainStrataDesc); 

//print('finalSamplePoints',finalSamplePoints);


// =====================================================================//
//                     FINAL CHECK                                      //
// =====================================================================//

// Here, we perform a final check that all data needs are met

//----------------------------------------------------------------------
// DATA NEED 1: 35 points in each land use
//----------------------------------------------------------------------
var landUseHisto = finalSamplePoints.aggregate_histogram('land_use');
print('Points in each land use',landUseHisto);

//----------------------------------------------------------------------
// DATA NEED 2: 35 points in each loss stratum
//----------------------------------------------------------------------

var lossHisto = finalSamplePoints.aggregate_histogram('loss_desc');
print('Points in each loss stratum',lossHisto);

//----------------------------------------------------------------------
// DATA NEED 3: 35 points in each gain stratum, within intervention sites
//----------------------------------------------------------------------

var interventionPts = finalSamplePoints.filter(ee.Filter.stringContains('land_use', 'intervention'));
var interventionHisto = interventionPts.aggregate_histogram('gain_desc');
print('Points in each gain stratum, within intervention sites', interventionHisto);


//===============================================================//
//                      Visualize                                //
//===============================================================//

Map.centerObject(farms, 12);
// Display the outline of boundaries as line with no fill.
// Create an empty image into which to paint the features, cast to byte.

//visualize gain and loss
var strataVisLoss = {min:1,max:4,palette:paletteLoss};
//Map.addLayer(allChange.select('loss_remapped'), strataVisLoss, 'Loss', false);
//Map.addLayer(allChange.select('gain_remapped'), {"min":0,"max":1,palette:paletteGainUnmasked}, 'Gain', false);

//grid
//Map.addLayer(displayGrid(proj),{}, 'Grid', false);

// all points - before land use added
//Map.addLayer(allPoints, {color: 'green'}, 'All points, before spatial filter', false);

//intervention points
//Map.addLayer(interventionPts, {color: 'green'}, 'intervention points', false);

//counterfactual points
var counterfactualPts = finalSamplePoints.filter(ee.Filter.stringContains('land_use', 'counterfactual'));
//Map.addLayer(counterfactualPts, {color: 'black'}, 'counterfactual points', false);

//reference points
var referencePts = finalSamplePoints.filter(ee.Filter.stringContains('land_use', 'reference'));
//Map.addLayer(referencePts, {color: 'blue'}, 'reference points', false);


// final sample points
//Map.addLayer(finalSamplePoints, {color: 'blue'}, 'Final sample points', false);

// // more gain=1 points within intervention
// Map.addLayer(gainInterv, {color: 'purple'}, 'Gain Within Intervention', false);

var empty = ee.Image().byte();
// // Paint all the polygon edges with the same number and width, display.


//all areas
var outlineAll = empty.paint({
  featureCollection: allAreas,
  color: 1,
  width: 2
});
Map.addLayer(outlineAll, {palette: 'pink'}, 'All Areas', false); 

//Farms
var outlineFarms = empty.paint({
  featureCollection: farms,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms', false); 

//Reference
var outlineReference = empty.paint({
  featureCollection: reference,
  color: 1,
  width: 2
});
Map.addLayer(outlineReference, {palette: paletteCiat.colors.colorReference}, 'Reference', false); 


//Interventions
var outlineInterventions = empty.paint({
  featureCollection: interventions,
  color: 1,
  width: 2
});
Map.addLayer(outlineInterventions, {palette: paletteCiat.colors.colorIntervention}, 'Interventions', false);


//Counterfactual
var outlineCounterfactual = empty.paint({
  featureCollection: counterfactuals,
  color: 1,
  width: 2
});
Map.addLayer(outlineCounterfactual, {palette: paletteCiat.colors.colorCounterfactual}, 'Counterfactual', false);


//Undesignated
var outlineUndes = empty.paint({
  featureCollection: farmsUndesignated,
  color: 1,
  width: 2
});
Map.addLayer(outlineUndes, {palette: paletteCiat.colors.colorUndesignated}, 'Undesignated', false);


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
                    'land_use', 'farm_id','in_farm',
                    //any other landtrendr values present (depends on result)
                    'gain_yod', 'gain_dsnr', 'gain_dur', 'gain_mag', 'gain_preval', 'gain_rate',
                    'loss_yod', 'loss_dsnr', 'loss_dur', 'loss_mag', 'loss_preval', 'loss_rate'];


Export.table.toDrive({
  collection: ptsCeo,
  //"system:index" and ".geo" are not allowed in the CEO csv upload. 
  selectors: fieldsExport, 
  fileNamePrefix: dealName + '_' + reportYear + '_samplePoints_forCEO_seed' + initialPtSeed + '_2023xxxx', 
  description: dealName + '_' + reportYear + '_samplePoints_forCEO_seed' + initialPtSeed + '_2023xxxx',  
  fileFormat: 'CSV'
});


//======================================================//
//                   pixel counts                       //
//======================================================//

// total gain/no gain within farms

var pc = require('users/ingperezescobar/TerraBio_final:pixelCountsReadable');

// Intervention pixel counts
// #####################
var requestDictGainInt = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: interventions, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_i = pc.getStatsImage(requestDictGainInt);
//print('countsGain interverventions',countsGain);
var readable_countsGain_intervention = pc.setReadable(countsGain_i, dictionaryGain);

var requestDictLossInt = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: interventions, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var countsLoss_i = pc.getStatsImage(requestDictLossInt);
print('countsLoss interventions',countsLoss_i);
var readable_countsLoss_intervention = pc.setReadable(countsLoss_i, dictionaryLoss);
// #####################


// Counterfactual pixel counts
// #####################
var requestDictGainC = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: counterfactuals, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_c = pc.getStatsImage(requestDictGainC);
var readable_countsGain_counterfactual = pc.setReadable(countsGain_c, dictionaryGain);
print('countsGain counterfactuals',countsGain_c);

var requestDictLossC = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: counterfactuals, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var counts_loss_c = pc.getStatsImage(requestDictLossC);
var readable_countsLoss_counterfactual = pc.setReadable(counts_loss_c, dictionaryLoss);
//print('Readable counts countsReadable_loss_c',countsReadable_loss_c);
// #####################


// farm pixel counts (not including counterfactual sites outside of farm boundaries)
// #####################
var requestDictGainF = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: farms, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_f = pc.getStatsImage(requestDictGainF);
var readable_countsGain_farm = pc.setReadable(countsGain_f, dictionaryGain);
//print('countsGain counterfactuals',countsGain);

var requestDictLossF = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: farms, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var counts_loss_f = pc.getStatsImage(requestDictLossF);
var readable_countsLoss_farm = pc.setReadable(counts_loss_f, dictionaryLoss);
//print('Readable counts countsReadable_loss_c',countsReadable_loss_c);
// #####################


// all areas pixel counts (farms + areas outside farm boundaries)
// #####################
var requestDictGainAll = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: allAreas, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_a = pc.getStatsImage(requestDictGainAll);
var readable_countsGain_allAreas = pc.setReadable(countsGain_a, dictionaryGain);
//print('countsGain counterfactuals',countsGain);

var requestDictLossAll = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: allAreas, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var countsLoss_a = pc.getStatsImage(requestDictLossAll);
var readable_countsLoss_allAreas = pc.setReadable(countsLoss_a, dictionaryLoss);
// #####################


// reference counts
// #####################
var requestDictGainR = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: reference, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_r = pc.getStatsImage(requestDictGainR);
var readable_countsGain_reference = pc.setReadable(countsGain_r, dictionaryGain);
//print('countsGain counterfactuals',countsGain);

var requestDictLossR = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: reference, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var countsLoss_r = pc.getStatsImage(requestDictLossR);
var readable_countsLoss_reference = pc.setReadable(countsLoss_r, dictionaryLoss);
//print('Readable counts countsReadable_loss_c',countsReadable_loss_c);
// #####################


// counts for farms, excluding intervention sites
// #####################

//define new multipolygon
var noIntervention = farms
      //note: mapping over features so can retain properties as oppsed to using .geometry 
      .map(function (f) { 
        var matrix = f
          .difference({'right': interventions.geometry(), 'maxError': 1});
        return matrix}); 

Map.addLayer(noIntervention,{},'farms minus intervention',true);

//var farms_no_int = farms.geometry().difference(interventions.geometry()) //similar to the "erase" function in ArcMap
//Map.addLayer(farms_no_int,{},'farms_no_int')

var requestDictGainNoInt = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: noIntervention, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_n = pc.getStatsImage(requestDictGainNoInt);
var readable_countsGain_noIntervention = pc.setReadable(countsGain_n, dictionaryGain);
//print('countsGain counterfactuals',countsGain);

var requestDictLossNoInt = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: noIntervention, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var countsLoss_n = pc.getStatsImage(requestDictLossNoInt);
var readable_countsLoss_noIntervention = pc.setReadable(countsLoss_n, dictionaryLoss);
//print('Readable counts countsReadable_loss_c',countsReadable_loss_c);
// #####################


// undesignated counts
// #####################
var requestDictGainU = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: farmsUndesignated, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_u = pc.getStatsImage(requestDictGainU);
var readable_countsGain_undesignated = pc.setReadable(countsGain_u, dictionaryGain);

var requestDictLossU = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: farmsUndesignated, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var countsLoss_u = pc.getStatsImage(requestDictLossU);
var readable_countsLoss_undesignated = pc.setReadable(countsLoss_u, dictionaryLoss);
// #####################

//======================================================//
//                  export pixel counts                 //
//======================================================//

var folder = 'TerraBio_data'

///////// interventions /////////

//loss 
Export.table.toDrive({
 collection:readable_countsLoss_intervention,
 description: 'countsReadable_loss_intervention',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain 
Export.table.toDrive({
 collection:readable_countsGain_intervention,
 description: 'countsReadable_gain_intervention',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

///////// counterfactual /////////

//loss 
Export.table.toDrive({
 collection:readable_countsLoss_counterfactual,
 description: 'countsReadable_loss_counterfactual',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain 
Export.table.toDrive({
 collection:readable_countsGain_counterfactual,
 description: 'countsReadable_gain_counterfactual',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

///////// all areas /////////

//loss 
Export.table.toDrive({
 collection:readable_countsLoss_allAreas,
 description: 'countsReadable_loss_allAreas',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain 
Export.table.toDrive({
 collection:readable_countsGain_allAreas,
 description: 'countsReadable_gain_allAreas',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

///////// reference /////////

//loss 
Export.table.toDrive({
 collection:readable_countsLoss_reference,
 description: 'countsReadable_loss_reference',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain 
Export.table.toDrive({
 collection:readable_countsGain_reference,
 description: 'countsReadable_gain_reference',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})


///////// farms (excluding land use polygons outside of farms) /////////

//loss 
Export.table.toDrive({
 collection:readable_countsLoss_farm,
 description: 'countsReadable_loss_farm',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain 
Export.table.toDrive({
 collection:readable_countsGain_farm,
 description: 'countsReadable_gain_farm',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

///////// all farm areas, excluding intervention /////////

//loss 
Export.table.toDrive({
 collection:readable_countsLoss_noIntervention,
 description: 'countsReadable_loss_noIntervention',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain 
Export.table.toDrive({
 collection:readable_countsGain_noIntervention,
 description: 'countsReadable_gain_noIntervention',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

///////// undesignated /////////

//loss 
Export.table.toDrive({
 collection:readable_countsLoss_undesignated,
 description: 'countsReadable_loss_undesignated',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain 
Export.table.toDrive({
 collection:readable_countsGain_undesignated,
 description: 'countsReadable_gain_undesignated',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})


/***
//======================================================//
//    OPTIONAL --- UPDATE                              //
//    Use existing CEO points to extract stratas       //
//======================================================//

var ceoCollected = gp.layers.ceo;
print('ceoCollected input: ', ceoCollected)
//var ceoCollected = CEOcollected
Map.addLayer(ceoCollected,{color:'red'},'ceoCollected')
print('ceoCollected size: ', ceoCollected.size())

var strataOutVis = allChange_simple
var description = 'Existing_CEO_getinfo_Reforesterra_'
var folder = 'Reforesterra_test_1_4_23'


function ceoClean(f){
  // LON,LAT,PLOTID,SAMPLEID.
  var fid = f.id();
  var coords = f.geometry().coordinates();
  return f.set('LON',coords.get(0),'LAT',coords.get(1));
  //return f.set('LON',coord.get,'LAT',lat,
  //        'PLOTID',plot,'SAMPLEID',fid);
}
// print("First sample point :",ee.Feature(stratSample.map(ceoClean).first()));



var pointData_v1 = strataOutVis.reduceRegions({
  //collection: ceoRaw,
  collection:ceoCollected,
  crs: proj,
  scale:30,
  reducer: ee.Reducer.first()
});
//print('ceoRaw',ceoRaw);

//add human-readable values for farm or not-farm strata
var dictionaryFarm = ee.Dictionary({
       2: "NotInFarm",
       1: "InFarm"
     });

var addFarmStrataDesc = function(pt){
  var thisDesc = dictionaryFarm.get(pt.get('in_farm'));
  return pt.set('in_farm_desc', thisDesc);
};
//print('Existing pointData_v1 info:') 
//print(pointData_v1);

var pointData = pointData_v1.map(addFarmStrataDesc); 
//print('Existing pointData info:', pointData);


print('Exisiting pointData first 10: ', pointData.limit(10))

//var pointData = pointData.map(ceoClean);
print('Existing pointData size: ',pointData.size())
//print('allChange projection gain_dsnr:', allChange.select('gain_dsnr').projection());
//print('allChange projection pl_gain_dsnr:', allChange.select('pl_gain_dsnr').projection());

Export.table.toDrive({collection:pointData, description:description+'-Drive', fileNamePrefix:description,
folder:folder});
**/


//==========================================================================================================
//
//          CODE PARKING LOT
//
//==========================================================================================================

//////////////// original method for sampling within land use polygon

// var moreReference = ee.FeatureCollection.randomPoints({
//   region: reference, //!!!change to the land use that needs additional points
//   points: referenceNeeded,  
//   seed: ptSeed
// });

// //print('moreReference',moreReference);

// moreReference = allChange.reduceRegions({
//   collection: moreReference, 
//   //point data, so using .first()
//   reducer: ee.Reducer.first(), 
// })
// .map(function(pt){
//       //fixing some apparent weirdness with value types (errors in histogram)
//       var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
//       var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
//       //also setting sampling_phase category
//       return pt.set('sampling_phase', 'more_landuse', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString)})

// //merge additional gain points into sample
// var allPoints = moreReference.merge(allPoints).map(valueType);
// print('allPoints',allPoints);

////

// var moreCounterfactual = ee.FeatureCollection.randomPoints({
//   region: counterfactuals, //!!!change to the land use that needs additional points
//   points: counterfactualNeeded,  
//   seed: ptSeed
// });

// //print('moreCounterfactual',moreCounterfactual);

// moreCounterfactual = allChange.reduceRegions({
//   collection: moreCounterfactual, 
//   //point data, so using .first()
//   reducer: ee.Reducer.first(), 
// })
// .map(function(pt){
//       //fixing some apparent weirdness with value types (errors in histogram)
//       var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
//       var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
//       //also setting sampling_phase category
//       return pt.set('sampling_phase', 'more_landuse', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString)})

// //merge additional gain points into sample
// var allPoints = moreCounterfactual.merge(allPoints).map(valueType);
// print('allPoints',allPoints);

//////////// using ee.Image.sample()

// /////// new method ///////////
// // Randomly sample within farm and add 'initial' to property 'sampling_phase'
// var moreReference = allChange
//   .sample({
//     region: reference,
//     scale: 30,
//     projection: proj, //set to projection defined above
//     numPixels: referenceNeeded,
//     seed: ptSeed,
//     tileScale: 8,
//     dropNulls: true
//   });
// print('moreReference',moreReference);

// //adds geometries to all the points
// moreReference = moreReference.map(function(f) {
//   return f.setGeometry(ee.Geometry.Point([f.getNumber('longitude'), f.getNumber('latitude')]))
// });

// moreReference = allChange.reduceRegions({
//   collection: moreReference, 
//   //point data, so using .first()
//   reducer: ee.Reducer.first(), 
// //carbon calculations need the simple random only, so identify with a property
// }).map(function(pt){return pt.set('sampling_phase', 'more_reference')});

///// 


// Randomly sample within farm and add 'initial' to property 'sampling_phase'
// var moreCounterfactual = allChange
//   .sample({
//     region: counterfactuals,
//     scale: 30,
//     projection: proj, //set to projection defined above
//     numPixels: counterfactualNeeded,
//     seed: ptSeed,
//     tileScale: 8,
//     dropNulls: true
//   });
// print('moreCounterfactual',moreCounterfactual);

// //adds geometries to all the points
// moreCounterfactual = moreCounterfactual.map(function(f) {
//   return f.setGeometry(ee.Geometry.Point([f.getNumber('longitude'), f.getNumber('latitude')]))
// });

// moreCounterfactual = allChange.reduceRegions({
//   collection: moreCounterfactual, 
//   //point data, so using .first()
//   reducer: ee.Reducer.first(), 
// //carbon calculations need the simple random only, so identify with a property
// }).map(function(pt){return pt.set('sampling_phase', 'more_counterfactual')});


///////////
/////////

// //attempting to generare area of pixel within polygon
// //does indeed show % of pixel area within polygon


//vector to raster

var assignProperty = function(f){
  return f.set('sample',1) };
  
allAreas = allAreas.map(assignProperty);
interventions = interventions.map(assignProperty);
counterfactuals = counterfactuals.map(assignProperty);
reference = reference.map(assignProperty);

var interventionRaster = reference.reduceToImage({
  properties: ['sample'], 
  reducer: ee.Reducer.anyNonZero()
});
//print('interventionRaster',interventionRaster);

//var test = allChange.updateMask(interventionRaster);

//Map.addLayer(interventionRaster,{},'interventionRaster',false);


var area = interventionRaster.clip(reference).multiply(ee.Image.pixelArea()).reproject(proj).rename('area');

//print('area',area);
Map.addLayer(area,{},'area',false);

// var mask = area.updateMask(area.gt(440)).selfMask();
// print('mask',mask);
// //Map.addLayer(mask,{},'mask',false);

