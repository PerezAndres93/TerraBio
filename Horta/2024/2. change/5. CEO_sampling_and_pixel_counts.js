// -------------------------------------------------------------------------------
// Sample points for CEO validation
// Authors: ?, Dawn Nekorchuk, Crystal Wespestad
// Description:  
//    SIMPLE RANDOM SAMPLE of points in designated land use areas
//      Programmatically adds stratified sampling to get minimum of points per change strata
//      Extract values at each point: strata, all change landtrendr bands, land use
//    Get Pixel counts to be used for the various area estimation metrics 
//  AFTER THIS - Do CEO validation, then when you have the confusion matrix, 
//                  go to confusion matrix script(s)
// Last updated & by: 2023-07-12 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-09-15: Adding new ways to count pixels for area estimation process by sub-strata
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
// 
// -------------------------------------------------------------------------------

//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.reforesterraTag);
/* Params */


//======================================================//
//                  Sampling Parameters                 //
//======================================================//

// Set seed so that can recreate same points, if needed.
var ptSeed = 4;

// There must be a minimum of 30 points in each category
//    adding 10% (3) points to be safe (in case we have to drop points for any reason)
var minPoints = 33;
//print('Min pts per strata', minPoints);

// Carbon calculations require SIMPLE random sampling
//  However, we need a minimum number per change strata
// Multiply total number of strata by 33 & add buffer % to attempt to catch enough on 'initial' phase 
var bufferPerc = 0.05; 
// NOTE: on testing, this was not actually helpful for Cafe Apui, but may in general be helpful on others, so keeping


//======================================================//
//                     Data Imports                     //
//======================================================//

//Will be adding land use to sampled points
// *** Update this according to deal *** //
var gp = require('users/ingperezescobar/TerraBio_final:reforesterra/2023/geometries parameters');

var farms = gp.layers.farms;
var interventions = gp.layers.interventionsInFarms;
var counterfactuals = gp.layers.counterfactualsInFarms;
var reference = gp.layers.referenceInFarms;
var farmsUndesignated = gp.layers.farmsUndesignated;

//aslo import current CEO points to extract new sub-strata values
var ceo = gp.layers.ceo
//var ceo_filter_a = gp.layer.ceo_filter_a
//var ceo_filter_b = gp.layer.ceo_filter_b
//var ceo_filter_c = gp.layer.ceo_filter_c
//var ceo_filter_d = gp.layer.ceo_filter_d

var ceoRaw = ceo

// ************************************* //
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
// var gain = gainImg.select('remapped').unmask(0); 
// var loss = lossImg.select('remapped');


var dictionaryGain = gp.params.dictionaryGain; 
var dictionaryLoss = gp.params.dictionaryLoss; 
//var dictionary_loss_then_gain = gp.params.dictionary_loss_then_gain;

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
// var dictionary_loss_then_gain = ee.Dictionary({
//     10: "StableForest NoGain",
//     11: "StableForest Gain",
//     20: "Degradation NoGain",
//     21: "Degradation Gain",
//     30: "Deforestation NoGain",
//     31: "Deforestation Gain",
//     40: "NonForest NoGain",
//     41: "NonForest Gain",
// });

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
var baseOutFolder = gp.params.baseOutputFolder;

var idField = gp.params.idField; 

//======================================================//
//       Add land use names to feature collection       //
//======================================================//

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
// Doesn't matter the different fields, we only care about 'land_use' and idField ('Codigo') here
var luNamedList = landUses.map(addLuName); 
//Global variable for use in the point function below
var allLandUses = ee.FeatureCollection(luNamedList).flatten(); 
//Map.addLayer(allLandUses,{},'All Land Uses')


// print('landUses',landUses);
// print('luNamedList',luNamedList);
// print('allLandUses',allLandUses); //this is a feature collection with "land_use" property

//======================================================//
//               Prepare loss/gain strata               //
//======================================================//

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
print('loss print',loss)
gain = gain
  .select(gain.bandNames(), newGainNames);
print('gain print',gain)  

var loss_gain = loss.select('loss_remapped').multiply(10).add(gain.select('gain_remapped')).rename('loss_then_gain')
  
//add bands into single image
var allChange = loss.addBands(gain).addBands(loss_gain);
print('allChange', allChange); 

//======================================================//
//       define spatial filter and save all join        //
//======================================================//

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

//======================================================//
//            add land use to change image              //
//======================================================//


//******* STEP 1: add integer land use property *******//

// 1=intervention
// 2=counterfactual
// 3=reference forest
// 4=undesignated

// var luIntegers = ee.Dictionary({
//   'interventions_pre2022_20230613': 1,
//   'counterfactuals_20230414': 2,
//   'forest_20230414': 3,
//   'farms_undesignated_20230613': 4
// });


// var addIntegerProperty = function(feature) {
//   var landUseInteger = luIntegers.get(feature.get('land_use'));
//   return feature.set('land_use_int', landUseInteger);
// };

// var allLandUses = allLandUses.map(addIntegerProperty)

// print('allLandUses - new',allLandUses); //this is a feature collection with "land_use" property

//add "land_use_int" property to allChange 

//******* STEP 2: -_- *******//



//======================================================//
//             Initial Simple Random Sample             //
//======================================================//

//Inital point sampling number
// Loss strata has the most strata at four, so 4 * the minimum number, plus a buffer
//  and round to integer for .randomPoints() input
var iniNumPts = ee.Number(4 * minPoints * (1 + bufferPerc)).round();
//print("iniNumPts",iniNumPts);

//Number of points per class
//  • similar to iniNumPts defitnion, but considering one strata at a time
var oneNumPts = ee.Number(1 * minPoints * (1 + bufferPerc)).round();

// Randomly sample and 
// Add 'initial' to property 'sampling_phase'
// Carbon will use only 'initial' (re Karis conversation 2023-05-12)
//  but need the 'additional' points to fill out strata for error
var randomPoints = ee.FeatureCollection.randomPoints({
  //IF there are land uses outside of farm boundaries, you must have a merged collection here. 
  region: farms,
  points: iniNumPts,  
  //points: 5000, 
  seed: ptSeed
});

// print(randomPoints);


//======================================================//
//        add change strata to random points            //
//======================================================//

//Add all Landtrendr band values to points
// Note that point will have both gain and loss strata info
//  and can be used for both 

var ptsStrata = allChange.reduceRegions({
  collection: randomPoints, 
  //point data, so using .first()
  reducer: ee.Reducer.first(), 
//carbon calculations need the simple random only, so identify with a property
}).map(function(pt){return pt.set('sampling_phase', 'initial')});

// print('randomPoints', randomPoints);
// print('ptsStrata', ptsStrata);




//======================================================//
//         needed points: by change strata              //
//======================================================//


// NEED: 35 points per change strata 

//Count per remapped strata
// Must split into gain / loss for the following
var histoLoss = ptsStrata.aggregate_histogram('loss_remapped'); 
var histoGain = ptsStrata.aggregate_histogram('gain_remapped'); 

// print('histogram for Loss', histoLoss); 
// print('histogram for Gain', histoGain);


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
// print('fcLossMore: Loss points to add', fcLossMore);
// print('fcGainMore: Gain points to add', fcGainMore);

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
    .map(function(pt){
      //fixing some apparent weirdness with value types (errors in histogram)
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'additional_loss', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString, 'loss_then_gain', loss_then_gain_RemappedString)});

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
      dropNulls: true, 
      geometries: true
    })
    .map(function(pt){
      //fixing some apparent weirdness with value types (errors in histogram)
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'additional_gain', 'loss_remapped', lossRemappedString, 'gain_remapped', gainRemappedString, 'loss_then_gain', loss_then_gain_RemappedString)});

// adding in 35 pts per gain strata within intervention sites to 
// address metric 2: regenerated/reforested area within intervention sites


//======================================================//
//           needed points: by land use                 //
//======================================================//

//NEED:
//  - 35 points per land use, excluding intervention
//  - 35 points per gain stratum within intervention

var interventionNeeded = ee.List([34,35]); //34 no gain, 35 gain

var moreInterventionPts = allChange 
    .stratifiedSample({
      //from the gain remapped band 
      classBand: 'gain_remapped',
      //required, but overruled with classPoints
      numPoints: oneNumPts, 
      region: interventions,
      scale: 30, 
      //reusing seed
      seed: ptSeed,
      classValues: gainKeys,
      classPoints: interventionNeeded,
      //important to keep "dropNulls: false"
      dropNulls: false, 
      geometries: true
    })
    .map(function(pt){
      //fixing some apparent weirdness with value types (errors in histogram)
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'more_intervention', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString, 'loss_then_gain', loss_then_gain_RemappedString)});

// There are only 23 counterfactual points. We need 12 more. 
// generate 12 random counterfactual points, from allChange

/** COMMENTED BY JORGE
var moreCounterfactualPoints = ee.FeatureCollection.randomPoints({
  //IF there are land uses outside of farm boundaries, you must have a merged collection here. 
  region: counterfactuals,
  points: 12,  
  seed: ptSeed
});

var moreCounterfactualPoints = allChange.reduceRegions({
  collection: moreCounterfactualPoints, 
  //point data, so using .first()
  reducer: ee.Reducer.first(), 
//carbon calculations need the simple random only, so identify with a property
})
.map(function(pt){
      //fixing some apparent weirdness with value types (errors in histogram)
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      //also setting sampling_phase category
      return pt.set('sampling_phase', 'more_counterfactual', 'gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString, 'loss_then_gain', loss_then_gain_RemappedString)});
**/
// Merge all additional points together
var addlPoints = moreLossPts.merge(moreGainPts);
var addlPoints = addlPoints.merge(moreInterventionPts);
//var addlPoints = addlPoints.merge(moreCounterfactualPoints); COMMENTED BY JORGE

// Merge all initial and additional points together
//  and fixing some apparent weirdness with value types (errors in histogram)
var allPoints = ptsStrata.map(function(pt){
      var gainRemappedString = ee.Number.parse(pt.get('gain_remapped'));
      var lossRemappedString = ee.Number.parse(pt.get('loss_remapped'));
      var loss_then_gain_RemappedString = ee.Number.parse(pt.get('loss_then_gain'));
      return pt.set('gain_remapped', gainRemappedString, 'loss_remapped', lossRemappedString, 'loss_then_gain', loss_then_gain_RemappedString);
}).merge(addlPoints); 

// print('moreLossPts', moreLossPts);
// print('moreGainPts', moreGainPts);
// var testDMN1 = addlPoints.aggregate_histogram('gain_remapped');
// print('testDMN1', testDMN1);
// var testDMN2 = allPoints.aggregate_histogram('gain_remapped');
// print('testDMN2', testDMN2);


//======================================================//
//    add human-readable values for gain/loss strata    //
//======================================================//

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

//print('allPoints',allPoints);


//======================================================//
//                      Visualize                       //
//======================================================//

Map.centerObject(farms, 13);
var strataVisLoss = {min:1,max:4,palette:paletteLoss};
// Map.addLayer(allChange.select('loss_remapped'), strataVisLoss, 'Loss', false);
// Map.addLayer(allChange.select('gain_remapped'), {palette:paletteGainUnmasked}, 'Gain', false);


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
var outlineInterventions = empty.paint({
  featureCollection: interventions,
  color: 1,
  width: 2
});
// Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms', false); 
// Map.addLayer(outlineInterventions, {palette: paletteCiat.colors.colorIntervention}, 'Interventions', false); 
// Map.addLayer(randomPoints, {color: 'blue'}, 'Initial random sample', false);
// Map.addLayer(addlPoints, {color: 'red'}, 'Additional stratified', false); 
// Map.addLayer(allPoints, {color: 'purple'}, 'All sampled points', false);



//======================================================//
//      add land use and farm ID to all points          //
//======================================================//

// Apply the join.
// Returns points with property withinPoly of the polygon it falls into
var sampledPtsPoly = saveAllJoin.apply(allPoints, allLandUses, spatialFilter);

//print('sampledPtsPoly',sampledPtsPoly);


// Now, add the land_use property of the withinPoly to the point
var sampledPtsLandUse = sampledPtsPoly.map(function(pt){
  //get feature it falls into (returns as list note)
  var polyList = pt.get('withinPoly');
  //This is where it is important point only falls into one polygon
  var polyObj = ee.List(polyList).get(0); 
  //get feature and grab the land_use and farm Codigo
  var polyLandUse = ee.Feature(polyObj).get('land_use');
  var polyFarmID = ee.Feature(polyObj).get(idField);
  //return point with new properties
  var ptLu = pt.set('land_use', polyLandUse,
                    'farm_id', polyFarmID);
  // and remove the withinPoly property (by selecting everything else)
  var ptClean = ptLu.select(
    ptLu.propertyNames().filter(ee.Filter.neq('item', 'withinPoly')));
  
  return ptClean;
});

//print('sampled points', sampledPtsLandUse);  //there should be 260 points in total


//======================================================//
//                   Point Counts                       //
//======================================================//

// // filter by land use
var samplesIntervention = sampledPtsLandUse.filter(ee.Filter.stringContains('land_use', 'intervention'));
var samplesCounterfactual = sampledPtsLandUse.filter(ee.Filter.stringContains('land_use', 'counterfactual'));
var samplesForest= sampledPtsLandUse.filter(ee.Filter.stringContains('land_use', 'forest'));
var samplesUndesignated = sampledPtsLandUse.filter(ee.Filter.stringContains('land_use', 'undesignated'));

// //counters per change stratum within each land use
var histoIntervention = samplesIntervention.aggregate_histogram('gain_remapped'); 
//print('intervention histo', histoIntervention);

var histoMoreIntervention = moreInterventionPts.aggregate_histogram('gain_remapped'); 
//print('more intervention histo', histoIntervention);

var interventionInitial = samplesIntervention.filter(ee.Filter.stringContains('sampling_phase', 'intervention'));
var histoInitialIntervention = interventionInitial.aggregate_histogram('gain_remapped'); 
//print('histoInitialIntervention', histoInitialIntervention);

var histoCounterfactual = samplesCounterfactual.aggregate_histogram('loss_remapped'); 
print('counterfactual histo', histoCounterfactual);
var histoForest = samplesForest.aggregate_histogram('loss_remapped'); 
print('forest histo', histoForest);
var histoUndesignated = samplesUndesignated.aggregate_histogram('loss_remapped'); 
print('Undesignated histo', histoUndesignated);

//counts of loss strata, gain strata, and land use
var histoLossAll = sampledPtsLandUse.aggregate_histogram('loss_remapped'); 
var histoGainAll = sampledPtsLandUse.aggregate_histogram('gain_remapped'); 
var histoLossGainAll = sampledPtsLandUse.aggregate_histogram('loss_then_gain'); 
var histoLUAll = sampledPtsLandUse.aggregate_histogram('land_use'); 
// print('histogram final loss', histoLossAll);
// print('histogram final gain', histoGainAll);
print('histogram loss_then_gain', histoLossGainAll);
// print('histogram for land use', histoLUAll);

//======================================================//
//                    sample subsets                    //
//======================================================//

//original sample: simple random sample densified for change strata
var originalSample = sampledPtsLandUse.filter(ee.Filter.stringContains('sampling_phase', 'initial'));
//print('originalSample',originalSample);

//additional points added to intervention sites, 35 pts per gain stratum
var interventionSample = sampledPtsLandUse.filter(ee.Filter.stringContains('sampling_phase', 'intervention'));


var newSample = sampledPtsLandUse.filter(ee.Filter.stringContains('sampling_phase', 'more'));

//print('only new counerfactual and intervention points',newSample);


//======================================================//
//                   pixel counts                       //
//======================================================//

// total gain/no gain within farms

var pc = require('users/ingperezescobar/TerraBio_final:pixelCountsReadable');
//var pc = require('users/dsaah/SIG-EE:CEO/pixelCountReadable');

// Intervention pixel counts
// #####################
var requestDictGain = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: interventions, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_i = pc.getStatsImage(requestDictGain);
//print('countsGain interverventions',countsGain);
var readable_gain_i = pc.setReadable(countsGain_i, dictionaryGain);

var requestDictLoss = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: interventions, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var countsLoss_i = pc.getStatsImage(requestDictLoss);
//print('countsLoss interventions',countsLoss);
var readable_loss_i = pc.setReadable(countsLoss_i, dictionaryLoss);

var requestDictLossGain = {
  image: loss_gain, //one or more bands
  statsBand: 'loss_then_gain', //the band name to generate stats
  groubBy : 'loss_then_gain', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: interventions, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var counts_loss_then_gain_i = pc.getStatsImage(requestDictLossGain);
//print('Count loss_then_gain interventions',counts_loss_then_gain);
var readable_loss_then_gain_i = pc.setReadable(counts_loss_then_gain_i, dictionary_loss_then_gain);
// #####################

/**
// Counterfactual pixel counts
// #####################
var requestDictGain = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: counterfactuals, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_c = pc.getStatsImage(requestDictGain);
var readable_countsGain_c = pc.setReadable(countsGain_c, dictionaryGain);
//print('countsGain counterfactuals',countsGain);

var requestDictLoss = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: counterfactuals, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var counts_loss_c = pc.getStatsImage(requestDictLoss);
var countsReadable_loss_c = pc.setReadable(counts_loss_c, dictionaryLoss);
//print('Readable counts countsReadable_loss_c',countsReadable_loss_c);


var requestDictLossGain = {
  image: loss_gain, //one or more bands
  statsBand: 'loss_then_gain', //the band name to generate stats
  groubBy : 'loss_then_gain', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: counterfactuals, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var counts_loss_then_gain = pc.getStatsImage(requestDictLossGain);
var readable_counts_loss_then_gain = pc.setReadable(counts_loss_then_gain, dictionary_loss_then_gain);
//print('Count loss_then_gain counterfactuals',counts_loss_then_gain);
// #####################
**/
// farm pixel counts
// #####################
var requestDictGain = {
  image: gain, //one or more bands
  statsBand: 'gain_remapped', //the band name to generate stats
  groubBy : 'gain_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: farms, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs: 'EPSG:4326'  //crs code to use
  }
var countsGain_f = pc.getStatsImage(requestDictGain);
var readable_countsGain_f = pc.setReadable(countsGain_f, dictionaryGain);
//print('countsGain counterfactuals',countsGain);

var requestDictLoss = {
  image: loss, //one or more bands
  statsBand: 'loss_remapped', //the band name to generate stats
  groubBy : 'loss_remapped', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: farms, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var counts_loss_f = pc.getStatsImage(requestDictLoss);
var countsReadable_loss_f = pc.setReadable(counts_loss_f, dictionaryLoss);
//print('Readable counts countsReadable_loss_c',countsReadable_loss_c);


var requestDictLossGain = {
  image: loss_gain, //one or more bands
  statsBand: 'loss_then_gain', //the band name to generate stats
  groubBy : 'loss_then_gain', //optional band name to group stats by
  reducer: 'count', // the type of ststs to generate :sum, count, mean
  region: farms, //the region of interest
  scale: 30, //the scale to calculate stats at
  crs : 'EPSG:4326'  //crs code to use
  }
var counts_loss_then_gain_farm = pc.getStatsImage(requestDictLossGain);
//print('Count loss_then_gain farm',counts_loss_then_gain);
var countsReadable_loss_then_gain_farm = pc.setReadable(counts_loss_then_gain_farm, dictionary_loss_then_gain);
// #####################

//======================================================//
//                  export pixel counts                 //
//======================================================//

var folder = '00_TerraBio'



//loss in intervention
Export.table.toDrive({
 collection:readable_loss_i,
 description: 'countsReadable_loss_intervention',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain in intervention
Export.table.toDrive({
 collection:readable_gain_i,
 description: 'countsReadable_gain_intervention',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//loss then gain in intervention
Export.table.toDrive({
 collection:readable_loss_then_gain_i,
 description: 'countsReadable_loss_then_gain_intervention',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})
/**
//loss in counterfactual
Export.table.toDrive({
 collection:countsReadable_loss_c,
 description: 'countsReadable_loss_counterfactual',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain in counterfactual
Export.table.toDrive({
 collection:readable_countsGain_c,
 description: 'countsReadable_gain_counterfactual',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//loss then gain in counterfactual
Export.table.toDrive({
 collection:readable_counts_loss_then_gain,
 description: 'countsReadable_loss_then_gain_counterfactual',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})
**/
//loss in farm
Export.table.toDrive({
 collection:countsReadable_loss_f,
 description: 'countsReadable_loss_farm',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//gain in farm
Export.table.toDrive({
 collection:readable_countsGain_f,
 description: 'countsReadable_gain_farm',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})

//loss then gain in farm
Export.table.toDrive({
 collection:countsReadable_loss_then_gain_farm,
 description: 'countsReadable_loss_then_gain_farm',
 folder:folder,
 selectors:'map_name,map_value,count,readable'
})






// pxCounts(gain,geometry); //131 no gain, 24 gain

// pxCounts(allChange,geometry); //131 no gain, 24 gain

//var totalFarmGain = gain.reduceRegion({
//    reducer: ee.Reducer.count(),
//    geometry: farms,
//    scale: 30,
//    maxPixels: 1e9,
//    crs:'EPSG:4326' 
//    });
//print('totalFarmGain',totalFarmGain);


// var totalFarmGain = gain.reduceRegion({
//     reducer: ee.Reducer.count(),
//     geometry: farms,
    
//     scale: 30,
//     maxPixels: 1e9,
//     crs:'EPSG:4326' 
//     });
// print('totalFarmGain',totalFarmGain);



// total gain/no gain within interventions



//======================================================//
//               Format for CEO and Export              //
//======================================================//


//*** Change which sample you want to export ***//

var sampledPoints = sampledPtsLandUse;
//var sampledPoints = newSample;
//var sampledPoints = originalSample; 
//var sampledPoints = interventionSample; 


// CEO-ify the points.
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

print('ptsCeo',ptsCeo)

//"system:index" and ".geo" are not allowed in the CEO csv upload. 
var fieldsExport = ['PLOTID', 'SAMPLEID', 'LON', 'LAT', 
                    // main strata info
                    'gain_remapped', 'gain_desc', 'loss_remapped', 'loss_then_gain', 'loss_desc', 'sampling_phase',
                    //land use and associated farm
                    'land_use', 'farm_id',
                    //any other landtrendr values present (depends on result)
                    'gain_yod', 'gain_dsnr', 'gain_dur', 'gain_mag', 'gain_preval', 'gain_rate',
                    'loss_yod', 'loss_dsnr', 'loss_dur', 'loss_mag', 'loss_preval', 'loss_rate'];


// Export.table.toDrive({
//   collection: ptsCeo,
//   //"system:index" and ".geo" are not allowed in the CEO csv upload. 
//   selectors: fieldsExport, 
//   fileNamePrefix: dealName + '_' + reportYear + '_sampledPoints_forCEO_seed' + ptSeed + '_2023xxxx', 
//   description: dealName + '_' + reportYear + '_sampledPoints_forCEO_seed' + ptSeed + '_2023xxxx', 
//   fileFormat: 'CSV'
// });

// Export.table.toDrive({
//   collection: ptsCeo,
//   //"system:index" and ".geo" are not allowed in the CEO csv upload. 
//   selectors: fieldsExport, 
//   fileNamePrefix: dealName + '_' + reportYear + '_interventionGainPoints_forCEO_seed' + ptSeed + '_2023xxxx', 
//   description: dealName + '_' + reportYear + '_interventionGainPoints_forCEO_seed' + ptSeed + '_2023xxxx',  
//   fileFormat: 'CSV'
// });

Export.table.toDrive({
  collection: ptsCeo,
  //"system:index" and ".geo" are not allowed in the CEO csv upload. 
  selectors: fieldsExport, 
  fileNamePrefix: dealName + '_' + reportYear + '_allSamplePoints_forCEO_seed' + ptSeed + '_2024xxxx', 
  description: dealName + '_' + reportYear + '_allSamplePoints_forCEO_seed' + ptSeed + '_2024xxxx',  
  fileFormat: 'CSV'
});

// Export.table.toAsset({
//   collection: ptsCeo,
//   //"system:index" and ".geo" are not allowed in the CEO csv upload. 
//   selectors: fieldsExport, 
//   assetID: dealName + '_' + reportYear + '_allSamplePoints_forCEO_seed' + ptSeed + '_2023xxxx', 
//   description: dealName + '_' + reportYear + '_allSamplePoints_forCEO_seed' + ptSeed + '_2023xxxx',  
//   fileFormat: 'CSV'
// });



//======================================================//
//    OPTIONAL                                          //
//    Use existing CEO points to extract stratas       //
//======================================================//


var strataOutVis = allChange
var description = 'Existing_CA2022_CEO_withsubstrata'


function ceoClean(f){
  // LON,LAT,PLOTID,SAMPLEID.
  var fid = f.id();
  var coords = f.geometry().coordinates();
  return f.set('LON',coords.get(0),'LAT',coords.get(1));
  //return f.set('LON',coord.get,'LAT',lat,
  //        'PLOTID',plot,'SAMPLEID',fid);
}
// print("First sample point :",ee.Feature(stratSample.map(ceoClean).first()));


// reduce the region to values from all map strata at current CEO locations

var pointData = strataOutVis.reduceRegions({
  collection: ceoRaw,
  crs: ee.Projection('EPSG:4326'),
  scale:30,
  reducer: ee.Reducer.first()
});
//print('ceoRaw',ceoRaw);
//print('exisiting pointData',pointData.limit(10))

var pointData = pointData.map(ceoClean);

print('pointData with coordinates',pointData)


Export.table.toDrive({collection:pointData, description:description+'-Drive', fileNamePrefix:description,
folder:folder});




//  AFTER THIS - Do CEO validation, then when you have the results, 
//                  go back to 2. change / confusion matrix script(s)


// CODE PARKING LOT ------------------------------------
// // THIS RESULTS IN INTERNAL ERROR 
// // Function to do a stratified random sample on needed
// //  Note that each feature represents a strata 
// function specificLossSampling(feat){
//   var morePoints = allChange
//     .stratifiedSample({
//       //the calculated number of points needed
//       numPoints: feat.get('needed'),
//       //from the loss remapped band 
//       classBand: 'loss_remapped',
//       region: farms,
//       scale: 30, 
//       //reusing seed
//       seed: ptSeed,
//       //the 'key' is the strata value 
//       //  string until casted as number and expecting a List
// ERROR PROBABLY HERE. MEANT to drop ee.List and just have []. This fx no longer needed though. 
//       classValues: [ee.List(ee.Number.parse(feat.get('key')))],
//       //It will drop points with null values in ANY band,
//       //  so set to false, otherwise e.g. for loss will not get 1-forest/4-non-forest points
//       //  as the other landtrendr change bands do not values
//       dropNulls: false, 
//       geometries: true
//     });
//   return morePoints; 
// }
// var newLoss = fcLossMore.map(specificLossSampling);
// print('newLoss', newLoss);

//--------------------------------

//clipped area for investigation of metric #2
// var allChange_clipped = allChange.clip(interventions.geometry())//.select('gain_remapped')
// Map.addLayer(allChange_clipped,{},'clipped_change_test') //this works

/////////////////////////////////////////////////////
// /* Repeat this on image clipped to intervention sites */
// var ptsStrata_clipped = allChange_clipped.reduceRegions({
//   collection: randomPoints, 
//   //point data, so using .first()
//   reducer: ee.Reducer.first(), 
// //carbon calculations need the simple random only, so identify with a property
// }).map(function(pt){return pt.set('sampling_phase', 'initial')});

// print('ptsStrata clipped', ptsStrata_clipped);

// var histoLoss_clipped = ptsStrata_clipped.aggregate_histogram('loss_remapped'); 
// var histoGain_clipped = ptsStrata_clipped.aggregate_histogram('gain_remapped'); 

// print('histogram for Loss clipped', histoLoss_clipped); 
// print('histogram for Gain clipped', histoGain_clipped);


// //======================================================//
// //       Simple Random Pull on Intervention Sites       //
// //======================================================//

// //var iniNumPts_intervention = ee.Number(minPoints * (1 + bufferPerc)).round();
// var iniNumPts_intervention = 1000;
// //print("initial number of points - intervention", iniNumPts_intervention)

// //generate random points within intervention sites
// var randomPoints_intervention = ee.FeatureCollection.randomPoints({
//   //IF there are land uses outside of farm boundaries, you must have a merged collection here. 
//   region: interventions,
//   points: iniNumPts_intervention,
//   seed: ptSeed
// });


// //Add all Landtrendr band values to points
// // Note that point will have both gain and loss strata info
// //  and can be used for both 

// var ptsStrata_intervention = allChange.reduceRegions({
//   collection: randomPoints_intervention, 
//   //point data, so using .first()
//   reducer: ee.Reducer.first(), 
// //carbon calculations need the simple random only, so identify with a property
// }).map(function(pt){return pt.set('sampling_phase', 'initial')});

// //print('randomPoints - intervention', randomPoints_intervention);
// //print('ptsStrata - intervention', ptsStrata_intervention);

// /* Count per remapped strata */

// // Must split into gain / loss for the following
// var histoLoss_intervention = ptsStrata_intervention.aggregate_histogram('loss_remapped'); 
// var histoGain_intervention = ptsStrata_intervention.aggregate_histogram('gain_remapped'); 

// // print('histogram for Loss - intervention', histoLoss_intervention); 
// // print('histogram for Gain - intervention', histoGain_intervention);

// //Turn dictionary into feature collection so can manipulate more easily
// var fcHistoLoss_intervention = ee.FeatureCollection(histoLoss_intervention.keys().map(function(k){
//   return ee.Feature(null, {key: k, value: histoLoss_intervention.getNumber(k)}); 
// })); 
// var fcHistoGain_intervention = ee.FeatureCollection(histoGain_intervention.keys().map(function(k){
//   return ee.Feature(null, {key: k, value: histoGain_intervention.getNumber(k)}); 
// })); 

// /* Add human readable value for gain/loss strata */

// ptsStrata_intervention = ptsStrata_intervention.map(addLossStrataDesc); 
// ptsStrata_intervention = ptsStrata_intervention.map(addGainStrataDesc); 

// //Map.addLayer(ptsStrata_intervention, {color: 'purple'}, 'All sampled points - intervention', false);


////////// pixel count code /////////////

// //comparing "gain_remapped" pixel counts in allChange vs. gain

// var pc = require('users/dsaah/SIG-EE:CEO/pixelCountReadable');

// function pxCounts(img,aoi){
//   var requestDict = {
//     image: img, //one or more bands
//     statsBand: 'gain_remapped', //the band name to generate stats
//     // groubBy : string //optional band name to group stats by
//     reducer: 'count', // the type of ststs to generate :sum, count, mean
//     region: aoi, //the region of interest
//     scale: 30, //the scale to calculate stats at
//     // crs : string //crs code to use
//     }
//   var counts = pc.getStatsImage(requestDict);
//   print('counts',counts);
// }

// pxCounts(gain,geometry); //131 no gain, 24 gain

// pxCounts(allChange,geometry); //131 no gain, 24 gain


