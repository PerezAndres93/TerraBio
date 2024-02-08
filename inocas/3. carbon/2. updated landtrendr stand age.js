// -------------------------------------------------------------------------------
// Yearly stand age 1985-end year using LandTrendR NDWI gain and loss and 
//    MapBiomas, NICFI, and Hansen combo FNF layer
// Authors: Vanessa Machuca
// Credit: 
//  - John Dilger: wrote original SBG stand age functions
//  - Hayley Pippin and Andrea Nicolau: wrote carbon calculation script based on John's work
//  - Tianchi Liu and Karis Tenneson: wrote the R stand age script
//
// Description: Calculates yearly, per pixel stand age based on the following categories
//  - forest in end year with no previous loss or gain
//  - forest in current year with no previous loss or gain
//  - forest in current year with previous gain NOT followed by loss
//  - not forest in current year with previous gain NOT followed by loss
//  - forest in end year with previous gain NOT followed by loss
//
// NOTE: exports results in crs EPSG:4326
// 
// Last updated & by: 2023-09-28 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-12-11: Updated to match ReforesTerra 2023 -vmachuca
//              - Added selfMask() to gainLossDiff. 
//              - Updated export description to include deal name and report year.
// 2023-10-03: SHARED WITH JORGE -vmachuca
// 2023-09-02: Include years leading up to stand age = 4 in gain yod. -vmachuca
// 2023-09-28: Removed step in which stand age raster multipled by max forest extent. -vmachuca
// 2023-09-21: Why are there -1 stand ages? -vmachuca
// 2023-09-19: Defined study end year forest extent outside of functions. Modified
//             regrowth after gain to account for gain yod - loss yod ≤ growthBeforeGain -vmachuca
// 2023-09-15: Finalized the stand age functions, adding F with previous loss. Wrote export section. -vmachuca
// 2023-09-14: Added two sub-functions for stable forest 1985-end year, and NF 1985-end year  -vmachuca
// 2023-09-13: Updated loss and gain layers. -vmachuca
// 2023-09-07: Wrote getEventOrder fcn.
// 2023-09-06: Added growthAfterLoss and growthBeforeGain. -vmachuca
// 2023-08-25: Change helper functions to select current year FNF, rather than max forest extent -vmachuca
//             Added farm polygons to maxForestExtent
// 2023-08-21: Deleted LT part, imported updated carbon LT gain and loss layers AND FNF combo layer -vmachuca
// 2023-08-18: Initiated this script by copying over and renaming "1.landtrendr long" 
//             Deleted all landtrendr generation parts and imported carbon LT gain and loss rasters -vmachuca
// 2023-08-17: Changed standAge(yearList) sub-functions to use CURRENT year forest extent -vmachuca
// 2023-08-11: Imported MapBiom+NICFI 1985-2021 combo FNF mask -vmachuca
// 2023-08-04: Finished porting Horta stand age function. They run, but don't do what they should. - vmachuca
// 2023-07-24: Further updated Horta stand age algorithms - vmachuca
// 2023-07-14: Ported functions relevant to stand age calculation from Horta + began updating them -vmachuca
// 2023-05-27: Ported 'change' landtrendr to 'carbon' landtrendr script -dnekorchuk
// 2023-05-17: Moved combo mask creation, export into script under 1. forest masks. -dnekorchuk
// 2023-05-11: Added asset export of combo FNF mask. -dnekorchuk
// 2023-05-09: Copied NICFI script to become this combination mask script. 
// 2023-05-01: Copied into Cafe Apui 2022, adapting, and merging into 1 loss/gain script,
//              by dnekorchuk
// 2023-03-02: Copied Horta 2022 script to 2023 and re-styled/formatted code, 
//              no function changes, added workload tag, by dnekorchuk
// ?:  Modifying TerraBio-specific stratification by Andréa 
// 2022-11: Adapted for TerraBio by Hayley Pippin and Kyle Woodward
// 2018-10-07: Creation of original: LANDTRENDR GREATEST DISTURBANCE MAPPING
//    author: Justin Braaten | jstnbraaten@gmail.com
//             Zhiqiang Yang  | zhiqiang.yang@oregonstate.edu
//             Robert Kennedy | rkennedy@coas.oregonstate.edu
//    parameter definitions: https://emapr.github.io/LT-GEE/api.html#getchangemap
//    website: https://github.com/eMapR/LT-GEE
//    notes: 
//      - you must add the LT-GEE API to your GEE account to run this script. 
//        Visit this URL to add it:
//        https://code.earthengine.google.com/?accept_repo=users/emaprlab/public
//      - use this app to help parameterize: 
//        https://emaprlab.users.earthengine.app/view/lt-gee-change-mapper
// -------------------------------------------------------------------------------
// Tags 
// 
// !!! = parts to change
// !*! = under construction, questions
// -------------------------------------------------------------------------------
 
//======================================================//
//                  Parameter and Imports               //
//======================================================//


//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.inocasTag);

//Geometries and parameters
var gp = require('users/ingperezescobar/TerraBio_final:inocas/2023/geometries parameters');
var aoi = gp.layers.aoi;
var farms = gp.layers.farms; 
var interventions = gp.layers.interventions;
//var counterfactuals = gp.layers.counterfactuals;
var farmsUndesignated = gp.layers.farmsUndesignated;
var reference = gp.layers.reference;

var reportYear = gp.params.reportYear;
var studyStartYear = gp.params.studyStartYear;
var studyEndYear = gp.params.studyEndYear;
var dealName = gp.params.dealName;

var nicfiEndYear = gp.layers.nicfiEndYear; //for visual comparison

//Landtrendr params
var startYear = gp.params.startYear;
var endYear = gp.params.endYear;
var startDay = gp.params.startDay;
var endDay = gp.params.endDay;
var numYears = studyEndYear - startYear;


//Other params
var baseOutFolder = gp.params.baseOutputFolder;
var baseDataFolder = gp.params.baseDataFolder;
var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 

var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors 
var paletteLoss = paletteCiat.colors.paletteLoss; 
var paletteGain = paletteCiat.colors.paletteGain; 

// source: https://github.com/gee-community/ee-palettes 
var palettes = require('users/gena/packages:palettes');
var yellowToGreenPalette = palettes.crameri.bamako[50].reverse();//palettes.colorbrewer.YlGn[9];

//FNF masks

var fnfComboLong = ee.Image(
  baseDataFolder + 'ForestMasks/comboFNF_yearly_' + startYear + '-' + studyEndYear); //1985-end year FNF layer

var carbonGain = gp.layers.landtrendr.carbonGain.unmask(0);  //NDFI
var carbonLoss = gp.layers.landtrendr.carbonLoss.unmask(0);

//======================================================//
//              Define Global Variables                 //
//======================================================//

//time range and constants

var yearList = ee.List.sequence(startYear,studyEndYear).getInfo();
var forestStartYear = startYear; // first year of study period 

var standAgeValue = 37.5; // define the assumed age of a forest by 1985. //!*! may need to be updated in the future
var growthBeforeGain = 4; // how many years before gain yod that the stand actually starts growing, derived from carbon growth curves
var growthAfterLoss = 1;  // how many years after loss yod that stand can start growing

//prepare loss, gain, and end year forest mask
var gain = carbonGain.select('yod');
var loss = carbonLoss.select('yod');
var endYearForestMask = fnfComboLong.select('fnf'+ studyEndYear).rename('mask_endYear'); 


//Calculate regrowth after gain. For each year in "yearList"
//  subtract "gain yod", for gain that occurred before that year.
var ltAnnualRegrowth = makeAnnualLtRegrowth(yearList, gain,loss);
//print('ltAnnualRegrowth', ltAnnualRegrowth);

//calculate regrowth after loss
var regrowthAfterLoss = makeAnnualGrowthAfterLoss(yearList, loss);

//generate image collection indicating if loss followed by gain 
//  or gain followed by loss for each year
var ltLossGainOrder = getEventOrder(yearList, gain, loss);
//print('ltLossGainOrder',ltLossGainOrder);


//======================================================//
//                   Run Stand Age                      //
//======================================================//

var out = ee.ImageCollection(standAge(yearList));
print(out);


//=========================================//
//VISUALIZE STAND AGE (MAP AND HISTOGRAM)  //
//=========================================//

Map.centerObject(aoi, 12);

//nicfi imagery
var visNicfi = {"bands":["R","G","B"],"min":64,"max":5454,"gamma":1.8};
//Map.addLayer(nicfiEndYear, visNicfi, 'NICFI 2021');

var changeVis = {"opacity":1,"bands":["yod"],"min":0,"max":2021,"palette":yellowToGreenPalette}; //!!! change "2021" to year of interest
// Map.addLayer(gain, changeVis, 'gain', false);
// Map.addLayer(loss, changeVis, 'loss', false);


// //forest mask map
// for(var i = 2017; i < 2022; i++){
//   var standAgeImg = out.filter(ee.Filter.calendarRange(i, i, 'year')).first();
//   var maskLabel = 'forest mask ' + i.toString();
//   Map.addLayer(standAgeImg.select('mask'),{"bands":["mask"],"min":0,"max":1},maskLabel, false);
// }

//Map.addLayer(fnfComboLong, {'bands': ['fnf2021'],'min': 0,'max': 1}, '2021 Forest Extent', false); //!!! change 'fnf2021' to year of interest

// stand age
var standAgeInspectVis = {"opacity":1,"bands":["standAge"],"min":0,"max":83,"palette":yellowToGreenPalette};

// for(var i = 2017; i < 2022; i++){
//   var standAgeImg = out.filter(ee.Filter.calendarRange(i, i, 'year')).first();
//   var standAgeLabel = 'stand age ' + i.toString();
//   Map.addLayer(standAgeImg.select('standAge'), standAgeInspectVis, standAgeLabel, false);
// }

// // loss case
// for(var i = 2017; i < 2022; i++){
//   var standAgeImg = lossCase.filter(ee.Filter.calendarRange(i, i, 'year')).first();
//   var standAgeLabel = 'loss case ' + i.toString();
//   Map.addLayer(standAgeImg.select('standAge'), standAgeInspectVis, standAgeLabel, false);
// }

var regrowthAgeVis = {"opacity":1,"bands":["regrowthAge"],"min":0,"max":83,"palette":yellowToGreenPalette};
//regrowth
// for(var i = 2017; i < 2022; i++){
//   var standAgeImg = ltAnnualRegrowth.filter(ee.Filter.calendarRange(i, i, 'year')).first();
//   var standAgeLabel = 'regrowth after gain ' + i.toString();
//   Map.addLayer(standAgeImg.select('regrowthAge'), regrowthAgeVis, standAgeLabel, false);
// }


//farms
var empty = ee.Image().byte();
var outlineFarms = empty.paint({
  featureCollection: farms,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarms, {palette: 'white'}, 'farms',false); 

//counterfactuals
//var empty = ee.Image().byte();
//var outlineCounterfactuals = empty.paint({
//  featureCollection: counterfactuals,
//  color: 1,
//  width: 2
//});
//Map.addLayer(outlineCounterfactuals, {palette: 'green'}, 'counterfactuals',false); 

//interventions 
var outlineIntv = empty.paint({
  featureCollection: interventions,
  color: 1,
  width: 2
});
Map.addLayer(outlineIntv, {palette: paletteCiat.colors.colorIntervention}, 'Interventions in 2021 and Prior',false); //yellow CIAT

//reference forest
var empty = ee.Image().byte();
var outlineReference = empty.paint({
  featureCollection: reference,
  color: 1,
  width: 2
});
Map.addLayer(outlineReference, {palette: 'blue'}, 'Reference',false); 


//undesignated farm
var empty = ee.Image().byte();
var outlineFarmsUndesignated = empty.paint({
  featureCollection: farmsUndesignated,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarmsUndesignated, {palette: 'red'}, 'Undesignated',false); 



/////// NOTE: the highest stand age values are misrepresented in this histogram
// // create stand age histogram
// var histYr = 2017; //!!!change to any year of interest
// var histImage = out.filter(ee.Filter.calendarRange(histYr, histYr, 'year'))
//                   .first()
//                   .select('standAge');

// var histStyle = {
//   title: 'Stand age across farms' + ' in ' + histYr + ' with assumed age of ' + standAgeValue + ' years',
//   hAxis: {
//     title: 'Stand Age'
//   },
//   vAxis: {
//     title: 'Count'
//   },
// };

// var standAgeHist = ui.Chart.image.histogram({
//   image: histImage,
//   region: farmsUndesignated,
//   scale: 30
// })//.setOptions(histStyle);

// print(histYr+' Stand Age Histogram',standAgeHist);


//======================================================//
//                    Convert to image                   //
// ======================================================//

var ageImage = out.select('standAge').toBands()
    .rename(yearList.map(function (y){return 'lt_standAge_'+y}));
var fnfImage = out.select('mask').toBands()
    .rename(yearList.map(function (y){return 'lt_FNF_'+y}));

var standAgeImage = ageImage.addBands(fnfImage);
//print('standAgeImage',standAgeImage);
//===================================================================================
// extract LandTrendr stand age at CEO points and add as band to CEO stand age image
//===================================================================================

//further prepare for CEO correction

var prepStandAge = standAgeImage.select(['lt_standAge_'+studyEndYear,'lt_FNF_'+studyEndYear]); 
print('prepStandAge',prepStandAge)

var lt_type = ee.Image(999) //default is non-stable stand age
                   .where(prepStandAge.select('lt_standAge_'+studyEndYear).eq(standAgeValue+(studyEndYear-startYear)),1)
                   .where(prepStandAge.select('lt_standAge_'+studyEndYear).neq(standAgeValue+(studyEndYear-startYear)),2)
                   .where(prepStandAge.select('lt_FNF_'+studyEndYear).eq(0),3)
                   .rename('lt_type_'+studyEndYear);
print('lt_type',lt_type);

prepStandAge = prepStandAge.addBands(lt_type);

//Map.addLayer(lt_type.clip(farms), {'bands': ['lt_type_'+studyEndYear],'min': 0,'max': 3}, 'type'+studyEndYear, false); 

// //extract LT stand age at CEO points
var ceoPoints = gp.layers.ceo//ee.FeatureCollection('projects/servir-amazonia/TerraBio/INOCAS/data/2023/ceo-2022_INOCAS_interpretation_COLLECT_PART2_counterfactual_sample_data_2023_11_12')
var standAgePoints = prepStandAge.sampleRegions({ 
  collection: ceoPoints,
  scale: 30,
  geometries: true
});
print('LT stand age extracted at ceo points',standAgePoints);

Export.table.toDrive({
  collection: standAgePoints,
  //"system:index" and ".geo" are not allowed in the CEO csv upload. 
  //selectors: fieldsExport, 
  fileNamePrefix: dealName + '_' + reportYear + '_combinedStandAge'+studyEndYear+'_2023xxxx', 
  description: dealName + '_' + reportYear + '_combinedStandAge'+studyEndYear+'_2023xxxx',  
  fileFormat: 'CSV'
});




// ======================================================//
//                     Export                            //
// ======================================================//

// EPSG:4326

//!!! changed description
//var description = 'yearlyStandAge_' + startYear + '-' + studyEndYear;
var description = dealName + reportYear + '_yearlyStandAge_' + startYear + '-' + studyEndYear;


Map.addLayer(standAgeImage,{},"standAgeImage")
Map.addLayer(ceoPoints,{},"CEOPoints")
Export.image.toDrive({
  image: standAgeImage.float(), 
  description: description + '_2023xxxx', //!!! input date that the image is exported
  dimensions: null, 
  region: aoi, 
  scale: 30, 
  crs: 'EPSG:4326', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});

Export.image.toAsset({
  image: standAgeImage.float(), 
  description: description + '_2023xxxx',  //!!! input date that the image is exported
  assetId: baseOutFolder + description + '_2023xxxx', 
  pyramidingPolicy: 'mode', 
  dimensions: null, 
  region: aoi, 
  scale: 30, 
  crs: 'EPSG:4326', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});

//export function for use in other scripts

exports = {
  standAge: standAge,
  identifyStandAgeFromStableForest:identifyStandAgeFromStableForest,
  identifyStandAgeFromStableForestIntermediate:identifyStandAgeFromStableForestIntermediate,
  identifyStandAgeFromLtGainAndCurrentForest:identifyStandAgeFromLtGainAndCurrentForest,
  identifyStandAgeFromLtGainAndCurrentNonForest:identifyStandAgeFromLtGainAndCurrentNonForest,
  identifyStandAgeFromLossAndCurrentForest:identifyStandAgeFromLossAndCurrentForest,
  makeAnnualLtRegrowth:makeAnnualLtRegrowth,
  makeAnnualGrowthAfterLoss:makeAnnualGrowthAfterLoss,
  getEventOrder:getEventOrder
};



//======================================================//
//                Stand Age Functions                   //
//======================================================//

// built from https://code.earthengine.google.com/4136417d543565dffb6641928fb73960
// modified to just calculate stand age

function standAge(yearList){
  // calculates final stand age for each year in study period
  // returns: image collection
  //  - one image per year across analysis timeframe 
  
  ///stable forest
  var standAgeStable = yearList.map(identifyStandAgeFromStableForest);
  var standAgeStableIntermediate = standAgeStable.map(identifyStandAgeFromStableForestIntermediate);
  //gain, no subsquent loss
  var standAgeLtGain = standAgeStableIntermediate.map(identifyStandAgeFromLtGainAndCurrentForest);
  var standAgeNonForestGain = standAgeLtGain.map(identifyStandAgeFromLtGainAndCurrentNonForest);
  //forest in end year, previous loss, no subsquent gain
  var standAgeForestLoss = standAgeNonForestGain.map(identifyStandAgeFromLossAndCurrentForest);
  
  return standAgeForestLoss;
}


// ------- Sub-Functions (called in "standAge()")  ------- //

//************ no loss or gain (stable forest)

function identifyStandAgeFromStableForest(yr){
  // calculates stand age for areas classified as forest in study end year 
  //      with NO detected loss or gain event in entire study period
  // first step in stand age calculation
  // depends on global variables: standAgeValue, forestStartYear, loss, gain
  // stand age = age in 47 + (current year - 1985) //!*! double check 47 - where forest stablizes, carbon growth rate
  // returns: image

  var startDate = ee.Date.fromYMD(yr,1,1);
  var currentYear = startDate.get('year');
  var currentForestMask = fnfComboLong.select('fnf'+ yr).rename('mask');
  //define future year so that it is studyEndYear when current year is less than growthBeforeGain less than study end Year
  //   this prevents issues later on, where function tries to access images that don't exist
  var futureYear = ee.Algorithms.If(currentYear.lte(studyEndYear-growthBeforeGain), yr+growthBeforeGain,studyEndYear);
  var futureDate = ee.Date.fromYMD(futureYear,1,1);
  
  //stable forest stand age should be (current year-1985)+47 (≤83)
  var stableStandAge = ee.Number(standAgeValue).add(currentYear.subtract(forestStartYear)); 
      
  var lossTemp = ee.Image(0).where(loss.lte(studyEndYear),loss).rename('lossTemp'); //loss events before studyEndYear
  var gainTemp = ee.Image(0).where(gain.lte(studyEndYear),gain).rename('gainTemp'); //gain events before studyEndYear
  
  var standAge = ee.Image(0) // image of zeros
      .where(endYearForestMask.eq(1) //pixels forested as of studyEndYear with...
      .and(lossTemp.eq(0)).and(gainTemp.eq(0)), stableStandAge) //...no gain or loss are assigned "standStandAge"
      .rename('standAge');
      
  //var type = ee.Image(0).where(standAge,1).rename('type'); 
  
  return standAge.addBands(currentForestMask).addBands(lossTemp).addBands(gainTemp).set('system:time_start',startDate.millis(),'futureDate',futureDate.millis());
}

function identifyStandAgeFromStableForestIntermediate(img){
  // calculates stand age for areas classified as forest in CURRENT YEAR
  //      with NO detected loss or gain event in entire study period
  // second step in stand age calculation
  // depends on global variables: standAgeValue, forestStartYear
  // stand age = 47 + (current year - 1985)
  // returns: image

  var startDate = ee.Date(img.get('system:time_start')); 
  var currentYear = startDate.get('year');
  var currentStandAge = img.select('standAge');
  var currentForestMask = img.select('mask');
  var lossTemp = img.select('lossTemp');
  var gainTemp = img.select('gainTemp');
  
  //stable forest stand age should be (current year-1985)+47
  var stableStandAge = ee.Number(standAgeValue).add(currentYear.subtract(forestStartYear)); 
    
  var modifiedStandAge = ee.Image(0) // image of zeros
    .where(currentStandAge, currentStandAge) //carry over ages from currentStandAge (stable forest)
      .where(currentForestMask.eq(1) //forest
      .and(currentStandAge.eq(0)) //no stand age yet assigned
      .and(lossTemp.eq(0)).and(gainTemp.eq(0)), stableStandAge) //no previous gain or loss, so assigned "standStandAge"
        .rename('standAge');
  
  //var type = img.select('type'); 
  //var modifiedType = type.where(modifiedStandAge,1); 
  
  return img.addBands(modifiedStandAge, undefined, true);
}

//************ previous gain, no subsequent loss

function identifyStandAgeFromLtGainAndCurrentForest(img,yr){ 
  // calculates stand age for areas classified as forest, with gain as the most recent event
  // third step in stand age calculation
  // depends on global variables: ltAnnualRegrowth, ltLossGainOrder
  // stand age = (current year - gain yod) + growthBeforeGain
  // returns: image
  
  var startDate = ee.Date(img.get('system:time_start')); 
  var currentYear = startDate.get('year');
  var currentStandAge = img.select('standAge');
  var currentForestMask = img.select('mask');

  var futureDate = ee.Date(img.get('futureDate')); 
  var futureYear = futureDate.get('year');
  
  // get CURRENT stand age from regrowth after gain, from ltAnnualRegrowth; and order of events
  var currentRegrowthAge = ltAnnualRegrowth.filterDate(startDate,startDate.advance(1, 'second')).first();
  var currentLossGainOrder = ltLossGainOrder.filterDate(startDate,startDate.advance(1, 'second')).first();
  //print('currentRegrowthAge',currentRegrowthAge);
  
  // get FUTURE stand age from regrowth after gain, from ltAnnualRegrowth; and order of events
  var futureRegrowthAge = ltAnnualRegrowth.filterDate(futureDate,futureDate.advance(1, 'second')).first();
  //print('futureRegrowthAge',futureRegrowthAge);
  //var futureLossGainOrder = ltLossGainOrder.filterDate(futureDate,futureDate.advance(1, 'second')).first();
  
  //!*! includes stand age leading up to gain year
  var modifiedStandAge = ee.Image(0) //image of zeroes 
    .where(currentStandAge, currentStandAge) //carry over ages from currentStandAge (stable forest)
      .where(currentForestMask.eq(1) //forest
        .and(currentStandAge.eq(0)) //no stand age yet assigned
        .and(futureRegrowthAge) //and regrowth calculated (so, there was previous gain)
        .and(currentLossGainOrder.neq(2)), currentRegrowthAge) //and gain NOT followed by loss
         .rename('standAge');
        
  //var type = img.select('type'); 
  //var modifiedType = type.where(modifiedStandAge,2); 
  
  return img.addBands(modifiedStandAge, undefined, true);
}


function identifyStandAgeFromLtGainAndCurrentNonForest(img,yr){
  // calculates stand age for areas classified as non-forest, with gain as the most recent event
  // fourth step in stand age calculation
  // depends on global variables: ltAnnualRegrowth, ltLossGainOrder
  // stand age = (current year - gain yod) + growthBeforeGain
  // returns: image
  
  var startDate = ee.Date(img.get('system:time_start'));
  var currentYear = startDate.get('year');
  var currentStandAge = img.select('standAge');
  var currentForestMask = img.select('mask');
  
  var futureDate = ee.Date(img.get('futureDate')); 
  var futureYear = futureDate.get('year');
  
  // get CURRENT stand age from regrowth after gain, from ltAnnualRegrowth; and order of events
  var currentRegrowthAge = ltAnnualRegrowth.filterDate(startDate,startDate.advance(1, 'second')).first();
  var currentLossGainOrder = ltLossGainOrder.filterDate(startDate,startDate.advance(1, 'second')).first();
  //print('currentRegrowthAge',currentRegrowthAge);
  
  // get FUTURE stand age from regrowth after gain, from ltAnnualRegrowth; and order of events
  var futureRegrowthAge = ltAnnualRegrowth.filterDate(futureDate,futureDate.advance(1, 'second')).first();
  //print('futureRegrowthAge',futureRegrowthAge);
  //var futureLossGainOrder = ltLossGainOrder.filterDate(futureDate,futureDate.advance(1, 'second')).first();
  
  //!*! includes stand age leading up to gain year
  var modifiedStandAge = ee.Image(0) //image of zeroes 
    .where(currentStandAge, currentStandAge) //carry over ages from currentStandAge (stable forest)
      .where(currentForestMask.eq(0) //forest
        .and(currentStandAge.eq(0)) //no stand age yet assigned
        .and(futureRegrowthAge) //and regrowth calculated (so, there was previous gain)
        .and(currentLossGainOrder.neq(2)), currentRegrowthAge) //and gain NOT followed by loss
          .rename('standAge');
  
  //var type = img.select('type'); 
  //var modifiedType = type.where(modifiedStandAge,2); 
  
  return img.addBands(modifiedStandAge, undefined, true);
}

//************ previous loss, no subsequent gain

function identifyStandAgeFromLossAndCurrentForest(img,yr){
  // calculates stand age areas that are forest in end year with loss as most recent event
  // fifth and final step in stand age calculation
  // depends on global variables: ltLossGainOrder, regrowthAfterLoss
  // stand age = current year - (loss yod + growthAfterLoss) 
  // returns: image
  
  var startDate = ee.Date(img.get('system:time_start'));
  var currentYear = startDate.get('year');
  var currentStandAge = img.select('standAge');
  var currentForestMask = img.select('mask');
  //var endYearForestMask = img.select('mask_endYear');

  // get loss order of events for current year (loss after gain, gain after loss)
  var currentLossGainOrder = ltLossGainOrder.filterDate(startDate,startDate.advance(1, 'second')).first();
  
  //stand age = current year - (loss yod + growthAfterLoss)  
  var lossRegrowthAge = regrowthAfterLoss.filterDate(startDate,startDate.advance(1, 'second')).first();
  
  var modifiedStandAge = ee.Image(0) //image of zeroes 
    .where(currentStandAge, currentStandAge) //carry over ages from currentStandAge (stable forest)
      .where(endYearForestMask.eq(1) //forest in 2021
        .and(currentStandAge.eq(0)) //no stand age yet assigned
        .and(lossRegrowthAge) //and regrowth calculated (so, there was previous gain)
        .and(currentLossGainOrder.neq(1)), lossRegrowthAge) //loss NOT followed by gain 
          .rename('standAge');
  
  //var type = img.select('type'); 
  //var modifiedType = type.where(modifiedStandAge,2).where(currentForestMask.eq(0),3); 
  
  return img.addBands(modifiedStandAge, undefined, true);
}


// ------- Helper Functions  ------- //

function makeAnnualLtRegrowth(yearList,ltGain,ltLoss){
  // calculates regrowth after from Landtrendr Gain
  // used to define global variable ltAnnualRegrowth
  // depends on global variables: growthBeforeGain
  // if gain yod - loss yod ≤ growthBeforeGain: regrowth = current year - loss yod
  //     else regrowth = (current year - gain yod) + growthBeforeGain
  // Also includes stand ages leading up to loss yod or gain yod (depending on the case)
  // returns: image collection
  //  - contains one image per year with regrowth age from detected gain event
  var landtrendrRegrowth = yearList.map(function(yr){
    //ORIGINAL code
    // var startDate = ee.Date.fromYMD(yr,1,1).millis();
    // var eeYr = ee.Number(yr);
    // var ltYearGain = ltGain.where(ltGain.gt(eeYr), 0).selfMask(); //gain events before or in current year 
    // var regrowthAge = ee.Image(eeYr).subtract(ltYearGain).add(growthBeforeGain); 
    
    //NEW code
    var startDate = ee.Date.fromYMD(yr,1,1).millis();
    var eeYr = ee.Number(yr);
    var futureYr = yr + growthBeforeGain;
    var ltYearGain = ltGain.where(ltGain.gt(futureYr), 0).selfMask(); //gain events before or in growthBeforeGain years AFTER current year 
    var ltYearLoss = ltLoss.where(ltLoss.gt(futureYr), 0).selfMask(); //loss events before or in growthBeforeGain years AFTER current year 
    
    //added this in November 2023
    var gainLossDiff = ee.Image(0).where(ltYearGain.gt(ltYearLoss),ltYearGain.subtract(ltYearLoss)).selfMask(); //difference, where gain occurs after loss
    
    var specialCase = ee.Image(eeYr).subtract(ltYearLoss); //for where gain-loss ≤ growthBeforeGain
  
    var regrowthAge = ee.Image(eeYr).subtract(ltYearGain).add(growthBeforeGain)
      .where(gainLossDiff.lte(growthBeforeGain).and(ltYearLoss.lte(eeYr)),specialCase) //take care of special case
      .where(gainLossDiff.lte(growthBeforeGain).and(ltYearLoss.gt(eeYr)),0); //zero out ages before the start of regrowth
    
    return regrowthAge.set('system:time_start',startDate).rename('regrowthAge'); 
  });
  var annualLtRegrowth = ee.ImageCollection(landtrendrRegrowth);
  
  return annualLtRegrowth;
}

function makeAnnualGrowthAfterLoss(yearList,ltLoss){
  // classifies regrowth age from Landtrendr Gain
  // used to define global variable ltAnnualRegrowth
  // depends on global variables: growthAfterLoss
  // returns: image collection
  //  - contains one image per year with regrowth age from detected gain event
  var landtrendrRegrowth = yearList.map(function(yr){
    var startDate = ee.Date.fromYMD(yr,1,1).millis();
    var eeYr = ee.Number(yr);
    var ltYear = ltLoss.where(ltLoss.gte(eeYr), 0).selfMask(); //loss events before year 
    
    var regrowthAge = ee.Image(eeYr).subtract(ltYear).subtract(growthAfterLoss).set('system:time_start',startDate); //.int()
    
    return regrowthAge.unmask(0).rename('lossRegrowthAge');
  });
  var annualLossRegrowth = ee.ImageCollection(landtrendrRegrowth);
  
  return annualLossRegrowth;
}

function getEventOrder(yearList,ltGain, ltLoss){
  // for each year
  //   - 1 if loss then gain
  //   - 2 if gain then loss
  //   - else, 0
  // used to define global variable ltLossGainOrder
  // returns: image collection
  //  - contains one image per year with classified order of events
  var classifyOrder = yearList.map(function(yr){
    var startDate = ee.Date.fromYMD(yr,1,1).millis();
    var eeYr = ee.Number(yr);
    
    //mask events that occurred after current year
    var ltGainYear = ltGain.where(ltGain.gt(eeYr), 0).selfMask(); 
    var ltLossYear = ltLoss.where(ltLoss.gt(eeYr), 0).selfMask();
    
    ltGainYear = ltGainYear.mask(ltLossYear); //carry over mask in ltLossYear to ltGainYear
    ltLossYear = ltLossYear.mask(ltGainYear); //carry over mask in ltGainYear to ltLossYear
    
    var diffYears = ee.Image(ltGainYear).subtract(ltLossYear);
    var orderClasses = ee.Image(0).where(diffYears.gt(0),1) // loss then gain
                                  .where(diffYears.lt(0),2) // gain then loss
                                  .selfMask().set('system:time_start',startDate);
    return orderClasses.rename('eventOrder').unmask(0);
  });
  
  var classifyOrderIC = ee.ImageCollection(classifyOrder);
  return classifyOrderIC;
}