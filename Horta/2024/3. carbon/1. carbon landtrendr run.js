// -------------------------------------------------------------------------------
// LandTrendr newest loss and gain (separate); with combination forest mask for loss strata
// Authors(SIG-version): Hayley Pippin, Kyle Woodward, Andréa Nicolau, Dawn Nekorchuk

// Description: This is the LONG run of change (full time period from 1985) 
//   for the CARBON landtrendr. This will use the 'carbon' index, not the 'change' index. 
//    Runs LandTrendr for loss and gain (separately)
//    and for loss, stratifies for TerraBio:
//     if disturbed, either degraded or deforested (depending on end year classification)
//     if not disturbed, either stable forest, or non-forest. 
//    Forest/non-forest mask was created using
//
//
// Last updated & by: 2023-08-21 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-10-02: SHARED -vmachuca
// 2023-09-13: Changed numYears to be startYear-endYear
// 2023-08-22: Changed to use carbon parameters (index, 1985 start for loss and gain).  -vmachuca
//             Changed to use 'users/retinta/Tutorials:LT_Utilities_NDFI' LT library.
//             Exported results to assets and to drive. 
// 2023-08-21: Updated to use MapBioams/Hansen/NICFI combo FNF mask, deleted stand age section -vmachuca
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
// !*! = under construction
// -------------------------------------------------------------------------------
 
//======================================================//
//                  Parameter and Imports               //
//======================================================//


//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.reforesterraTag);

//Geometries and parameters
var gp = require('users/ingperezescobar/TerraBio_final:reforesterra/2023/geometries parameters');
var aoi = gp.layers.aoi;
var farms = gp.layers.farms; //for visualization
var reference = gp.layers.referenceInFarms; //for visualization
var interventions = gp.layers.interventionsInFarms;
var studyStartYear = gp.params.studyStartYear; 
var studyEndYear = gp.params.studyEndYear;
var dealName = gp.params.dealName;

var nicfiEndYear = gp.layers.nicfiEndYear; //for visual comparison

//Landtrendr params
var startYear = gp.params.startYear;
var endYear = gp.params.endYear;
var startDay = gp.params.startDay;
var endDay = gp.params.endDay;
var maskThese = gp.params.maskThese;
var samzParams = gp.params.samzNeutral_jorge;
var runVersion = samzParams.runVersion;
var runParams = samzParams.runParams;

var numYears = studyEndYear - startYear + 1;

var index = gp.params.indexCarbon; 
//print(index);

// loss and gain parameters - using change parameters, then assigning carbon index (NDFI) and start year (1985)
var changeParamsLoss = samzParams.changeParamsLoss;
changeParamsLoss.index = index;
changeParamsLoss.year.start = startYear; 

var changeParamsGain = samzParams.changeParamsGain; 
changeParamsGain.index = index;
changeParamsGain.year.start = startYear; 

//Other params
var baseOutFolder = gp.params.baseOutputFolder;
var baseDataFolder = gp.params.baseDataFolder;

var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors 
var paletteLoss = paletteCiat.colors.paletteLoss; 
var paletteGain = paletteCiat.colors.paletteGain; 


// FNF 2018-end year
var fnfCombo = ee.Image(
  baseDataFolder + 'ForestMasks/comboFNF_yearly_' + studyStartYear + '-' + studyEndYear); 

var fnfEnd = fnfCombo.select('fnf'+studyEndYear);

// FNF 1985-end year
var fnfComboLong = ee.Image(
  //baseDataFolder + 'ForestMasks/comboNicfiMapbiomasFNF_yearly_' + startYear + '-' + studyEndYear); //1985-2021 FNF layer
  //baseDataFolder + 'ForestMasks/NicfiMapbiomasFNF_yearly_' + startYear + '-' + studyEndYear); //1985-2021 FNF layer
  //baseDataFolder + 'ForestMasks/comboFNF_yearly_' + startYear + '-' + studyEndYear); //1985-2021 FNF layer //!*! orignally used by Jorge 10/14
  baseDataFolder + 'ForestMasks/comboFNF_yearly_' + startYear + '-' + studyEndYear);

  
//Map.addLayer(fnfComboLong,{},"fnfComboLong_visualizar")
var fnfEndLong = fnfComboLong.select('fnf'+studyEndYear);

// original LandTrendr.js module
//var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

// using the LandTrendR Library that has NDFI added
// this is a copy of the above, with NDFI added as an option 
var ltgee = require('users/retinta/Tutorials:LT_Utilities_NDFI');


//======================================================//
//                  Run LandTrendr                      //
//======================================================//

//https://emapr.github.io/LT-GEE/running-lt-gee.html
// from module exports.runLT = function(startYear, endYear, startDay, endDay, 
//                          aoi, index, ftvList, runParams, maskThese, exclude)

var lt = ltgee.runLT(startYear, endYear, startDay, endDay, 
                      aoi.geometry(), index, [], runParams, maskThese);

//print('lt',lt);

//==========================================//
//                 Gain                     //
//==========================================//

var metadataGain = {
  CollectionParams_startYear:startYear,
  CollectionParams_endYear:endYear,
  CollectionParams_startDay:startDay,
  CollectionParams_endDay:endDay,
  CollectionParams_aoi:aoi,
  CollectionParams_index:index,
  CollectionParams_maskThese:String(maskThese),
  ChangeParams_delta:changeParamsGain.delta,
  ChangeParams_sort:changeParamsGain.sort,
  ChangeParams_year:changeParamsGain.year.checked + ',' + changeParamsGain.year.start + ',' + changeParamsGain.year.end,
  ChangeParams_mag:changeParamsGain.mag.checked + ',' + changeParamsGain.mag.value + ',' + changeParamsGain.mag.operator,
  ChangeParams_dur:changeParamsGain.dur.checked + ',' + changeParamsGain.dur.value + ',' + changeParamsGain.dur.operator,
  ChangeParams_preval:changeParamsGain.preval.checked + ',' + changeParamsGain.preval.value + ',' + changeParamsGain.preval.operator,
  ChangeParams_mmu:changeParamsGain.mmu.checked + ',' + changeParamsGain.mmu.value,
  RunParams_maxSegments: runParams.maxSegments,
  RunParams_spikeThreshold: runParams.spikeThreshold,
  RunParams_vertexCountOvershoot: runParams.vertexCountOvershoot,
  RunParams_preventOneYearRecovery: runParams.preventOneYearRecovery,
  RunParams_recoveryThreshold: runParams.recoveryThreshold,
  RunParams_pvalThreshold: runParams.pvalThreshold,
  RunParams_bestModelProportion: runParams.bestModelProportion,
  RunParams_minObservationsNeeded: runParams.minObservationsNeeded  ,
};


// Get the change map layers for gain
var changeImgGain = ltgee.getChangeMap(lt, changeParamsGain).set(metadataGain);
//print('changeImg Gain', changeImgGain);

// TerraBio-specific strata classification

//For gain, more simple than for loss categorization of deforestation/degredation 
// gain = 1 
// and match everything same as Loss strata image
var strataGain = changeImgGain
    .select('yod').neq(0).rename('remapped')
    .addBands(changeImgGain)
    .short()
    //lost during strata calc
    .set(metadataGain); 

//print('strataGain', strataGain);


//==========================================//
//                 Loss                     //
//==========================================//

var metadataLoss = {
  CollectionParams_startYear:startYear,
  CollectionParams_endYear:endYear,
  CollectionParams_startDay:startDay,
  CollectionParams_endDay:endDay,
  CollectionParams_aoi:aoi,
  CollectionParams_index:index,
  CollectionParams_maskThese:String(maskThese),
  ChangeParams_delta:changeParamsLoss.delta,
  ChangeParams_sort:changeParamsLoss.sort,
  ChangeParams_year:changeParamsLoss.year.checked + ',' + changeParamsLoss.year.start + ',' + changeParamsLoss.year.end,
  ChangeParams_mag:changeParamsLoss.mag.checked + ',' + changeParamsLoss.mag.value + ',' + changeParamsLoss.mag.operator,
  ChangeParams_dur:changeParamsLoss.dur.checked + ',' + changeParamsLoss.dur.value + ',' + changeParamsLoss.dur.operator,
  ChangeParams_preval:changeParamsLoss.preval.checked + ',' + changeParamsLoss.preval.value + ',' + changeParamsLoss.preval.operator,
  ChangeParams_mmu:changeParamsLoss.mmu.checked + ',' + changeParamsLoss.mmu.value,
  RunParams_maxSegments: runParams.maxSegments,
  RunParams_spikeThreshold: runParams.spikeThreshold,
  RunParams_vertexCountOvershoot: runParams.vertexCountOvershoot,
  RunParams_preventOneYearRecovery: runParams.preventOneYearRecovery,
  RunParams_recoveryThreshold: runParams.recoveryThreshold,
  RunParams_pvalThreshold: runParams.pvalThreshold,
  RunParams_bestModelProportion: runParams.bestModelProportion,
  RunParams_minObservationsNeeded: runParams.minObservationsNeeded
};

//print('metadataLoss',metadataLoss);

// Get the change map layers
var changeImgLoss = ltgee.getChangeMap(lt, changeParamsLoss).set(metadataLoss); //metadata will be lost below
//print('changeImgLoss', changeImgLoss);

// TerraBio-specific strata classification 

// For areas mapped as disturbances by LT:
// 2 if areas are F at FNFendyear -- degradation
// 3 if areas are NF at FNF end year -- deforestation
// for areas not mapped as disturbances by LT:
// 1 if areas are F for all the years in FNFallyear -- stable forest
// 4 for the rest -- Non forest

// IF THESE STRATA CHANGE, 
//  make sure to create a new loss/gain color palette (in 'color' module)
//  or modify per deal in their scripts


/// forest during all the years 
var forestAllYears = fnfComboLong
      .reduce(ee.Reducer.sum())
      .eq(numYears) 
      .rename('forest_all_years');

var nondist = changeImgLoss
  .not()// making disturbance areas 0.
  .select('yod') // selecting one band.
  .unmask(4) // unmasking areas (non-disturbance) and assigning value of 4.
  .selfMask() // masking disturbance areas.
  .where(forestAllYears,1) // 1 if areas are F for all the years in FNFallyear -- stable forest; 4 for the rest -- Non forest.
  .unmask(0); // unmasking to add to the disturbance img below.

var dist = changeImgLoss
  .not() // making non disturbed areas 1 and disturbed 0.
  .select('yod') // selecting one band.
  .where((fnfpreEnd.eq(0).add(fnfEnd.eq(1))).eq(2) ,2)
  .where((fnfpreEnd.eq(1).add(fnfEnd.eq(1))).eq(2) ,1)// disturbed + forest at end = degradation >> 2.
  //.where(fnfEndLong,2) // disturbed + forest at end = degradation >> 2.
  .remap([0,1,2],[3,1,2]) // disturbed + nonforest at end = deforestation >> 3.
  .rename('dist')
  .select('dist')
  .unmask(); // unmasking (non-disturbance areas) to add to the nondist img above.

var strataLoss = dist.add(nondist)
  .rename('remapped')
  .addBands(changeImgLoss)
  .short()
  //lost during strata calc
  .set(metadataLoss); 
//print('strataLoss', strataLoss);


//======================================================//
//                    Visualizations                    //
//======================================================//

Map.centerObject(aoi, 12);

//nicfi imagery
var visNicfi = {"bands":["R","G","B"],"min":64,"max":5454,"gamma":1.8};
Map.addLayer(nicfiEndYear, visNicfi, 'NICFI'+studyEndYear);

// set visualization dictionaries
var palette = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000'];
var yodVizParms = {
  min: startYear,
  max: endYear,
  palette: palette
};
var magVizParms = {
  min: 200,
  max: 800,
  palette: palette
};

////// Visualize and check range to make sure 1985-2021

// /* Visualize gain */  

var strataVisGain = {palette:paletteGain};
Map.addLayer(strataGain.select('remapped').clip(aoi), strataVisGain, 'Gain', false);
//Map.addLayer(strataGain.select('yod'), yodVizParms, 'Gain', false);

// /* Visualize loss */

var strataVisLoss = {min:1,max:4,palette:paletteLoss};
Map.addLayer(strataLoss.select('remapped').clip(aoi), strataVisLoss, 'Loss', false);
//Map.addLayer(strataLoss.select('yod'), yodVizParms, 'Loss', false);

// /* Visualize others to check, if needed */


// display the change attribute map - note that there are other layers - print changeImg to console to see all
//Map.addLayer(changeImgLoss.select(['mag']), magVizParms, 'Magnitude of Change (loss)',false);
//Map.addLayer(changeImgLoss.select(['yod']), yodVizParms, 'Year of Detection (loss)',false);


// /* Visualize land uses */

// //farms 
var empty = ee.Image().byte();
var outlineFarms = empty.paint({
  featureCollection: farms,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms');

// //interventions 
// var outlineIntv = empty.paint({
//   featureCollection: interventions,
//   color: 1,
//   width: 2
// });
// Map.addLayer(outlineIntv, {palette: paletteCiat.colors.colorIntervention}, 'Interventions in 2021 and Prior', false); //yellow CIAT



//======================================================//
//        Export Carbon LT Loss and Gain Layer          //
//======================================================//

//Export carbon LT gain

var descriptionGain = 'carbonLT_' + changeParamsGain.delta
  + '_' + changeParamsGain.sort
  + '_' + startYear 
  + '_' + changeParamsGain.year.end 
  + '_' + 'SAMZguidance' 
  + '_' + runVersion; 

Export.image.toAsset({
  image: strataGain, 
  description: descriptionGain, 
  assetId: baseOutFolder + descriptionGain, 
  region: aoi, 
  scale: 30, 
  // crs: 'EPSG:5070', 
  //maxPixels: 1e13
});

Export.image.toDrive({
  image: strataGain, 
  description: descriptionGain, 
  //folder: 'TerraBio_data', 
  region: aoi, 
  scale: 30, 
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});

//Export carbon LT loss

var descriptionLoss = 'carbonLT_' + changeParamsLoss.delta 
  + '_' + 'comboFNFLong' 
  + '_' + changeParamsLoss.sort
  + '_' + startYear 
  + '_' + changeParamsLoss.year.end 
  + '_' + 'SAMZguidance' 
  + '_' + runVersion; 

Export.image.toAsset({
  image: strataLoss, 
  description: descriptionLoss, 
  assetId: baseOutFolder+descriptionLoss, 
  region: aoi, 
  scale: 30 
  // crs: 'EPSG:5070', 
  //maxPixels: 1e13
});

Export.image.toDrive({
  image: strataLoss, 
  description: descriptionLoss, 
  //folder: 'TerraBio_data', 
  region: aoi, 
  scale: 30, 
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});





