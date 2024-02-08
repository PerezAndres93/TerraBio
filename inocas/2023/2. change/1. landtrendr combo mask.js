// -------------------------------------------------------------------------------
// LandTrendr newest loss and gain (separate); with combination forest mask for loss strata
// Authors: SIG
// Description: 
//    Runs LandTrendr for loss and gain (separately)
//    and for loss, stratifies for TerraBio:
//     if disturbed, either degraded or deforested (depending on end year classification)
//     if not disturbed, either stable forest, or non-forest. 
//    Forest/non-forest mask was created using an overlay of the MapBiomas & NICFI masks
//      where if EITHER had a pixel as forest, then it was designated as forest. 
//    This lets us use the local knowledge MapBiomas, but improves the forest underestimation
//      (as seen in Horta) using the NICFI mask. This also reduces any salt&pepper effect from 
//      the NICFI classifier. 
// Last updated & by: 2023-05-19 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// Edited FNF mask: using NICFI FNF mask becose there is no image to 2022 from MapBiomas.
// 2023-05-19: Clarified which index being used, made number of study years programmatic -dnekorchuk
// 2023-05-17: Copied to Horta, started port -dnekorchuk
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


/* Parameters & Imports */ 


//Geometries and parameters
var gp = require('users/ingperezescobar/TerraBio_final:inocas/2023/geometries parameters');
var aoi = gp.layers.aoi;
var farms = gp.layers.farms; //for visualization
var reference = gp.layers.reference; //for visualization
var interventions = gp.layers.interventions; //for visualization
var undesignated = gp.layers.farmsUndesignated; //for visualization
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
var indexChange = gp.params.indexChange;
print(indexChange);
var maskThese = gp.params.maskThese;
var samzParams = gp.params.samzHigh_jorge; //Original samzNeutral For LOSS
var runVersion = samzParams.runVersion;
var runParams = samzParams.runParams;

var samzParams2 = gp.params.samzNeutral_jorge; //For GAIN
var runVersion2 = samzParams2.runVersion;
var runParams2 = samzParams2.runParams;


var baseOutFolder = gp.params.baseOutputFolder;
var baseDataFolder = gp.params.baseDataFolder;

var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors
var paletteLoss = paletteCiat.colors.paletteLoss; 
var paletteGain = paletteCiat.colors.paletteGain; 

// Reminder: 
// var paletteLoss = [paletteCiat.colors.colorStableForest, //1, stable forest
//                     paletteCiat.colors.colorDegradation, //2, degradation
//                     paletteCiat.colors.colorDeforestation, //3, deforestation
//                     paletteCiat.colors.colorBackground]; //4, non-forest 
// var paletteGain = [paletteCiat.colors.colorGain]; //1, gain

//FNF masks
var fnfCombo = ee.Image(
  //baseDataFolder + 'ForestMasks/comboFNF_yearly_' + studyStartYear + '-' + studyEndYear // edited because there is no FNF mask to 2022 from Mapbiomas
  baseDataFolder + 'ForestMasks/comboFNF_yearly_' + studyStartYear + '-' + studyEndYear); 

var fnfEnd = fnfCombo.select('fnf'+studyEndYear);


// load the LandTrendr.js module
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 



/* Run LandTrendr */

//https://emapr.github.io/LT-GEE/running-lt-gee.html
// from module exports.runLT = function(startYear, endYear, startDay, endDay, 
//                          aoi, index, ftvList, runParams, maskThese, exclude)
var lt = ltgee.runLT(startYear, endYear, startDay, endDay,
                      aoi.geometry(), indexChange, [], runParams, maskThese);


/* Loss */

var changeParamsLoss = samzParams.changeParamsLoss; 
// add index to changeParams object
changeParamsLoss.index = indexChange;

var metadataLoss = {
  CollectionParams_startYear:startYear,
  CollectionParams_endYear:endYear,
  CollectionParams_startDay:startDay,
  CollectionParams_endDay:endDay,
  CollectionParams_aoi:aoi,
  CollectionParams_index:indexChange,
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

// Get the change map layers
var changeImgLoss = ltgee.getChangeMap(lt, changeParamsLoss).set(metadataLoss);
print('changeImgLoss', changeImgLoss);

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
var studyNumYears = studyEndYear - studyStartYear + 1; //years are inclusive when counting, so plus one 
print('Number of years in change analysis', studyNumYears);
var forestAllYears = fnfCombo
      .reduce(ee.Reducer.sum())
      .eq(studyNumYears)
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
  .where(fnfEnd,2) // disturbed + forest at end = degradation >> 2.
  .remap([0,2],[3,2]) // disturbed + nonforest at end = deforestation >> 3.
  .rename('dist')
  .select('dist')
  .unmask(); // unmasking (non-disturbance areas) to add to the nondist img above.

var strataLoss = dist.add(nondist)
  .rename('remapped')
  .addBands(changeImgLoss)
  .short()
  //lost during strata calc
  .set(metadataLoss); 

print('strataLoss', strataLoss);

/* Visualize loss */

Map.centerObject(aoi, 12);

//TerraBio stratified results
var strataVisLoss = {min:1,max:4,palette:paletteLoss};
Map.addLayer(strataLoss.select('remapped'), strataVisLoss, 'Loss', false);

/* Visualize others to check, if needed */

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

// display the change attribute map - note that there are other layers - print changeImg to console to see all
Map.addLayer(changeImgLoss.select(['mag']), magVizParms, 'Magnitude of Change (loss)',false);
Map.addLayer(changeImgLoss.select(['yod']), yodVizParms, 'Year of Detection (loss)',false);

//Intermediate steps
var vis = {
  'bands':["R","G","B"],
  'min':64,
  'max':5454,
  'gamma':1.8
};
Map.addLayer(nicfiEndYear, vis, studyEndYear+'-07 NICFI mosaic', false);

var pal = {min:0, max:1, palette:['grey','green']};
Map.addLayer(fnfCombo.select('fnf'+studyEndYear), pal, 'FNF Combo '+studyEndYear, false);




/* Export Loss asset */ 

var descriptionLoss = 'lt_' + changeParamsLoss.delta 
  //+ '_' + 'comboMask' 
  + '_' + 'nicfiMask' // edited by the name of FNF mask
  + '_' + changeParamsLoss.sort
  + '_' + changeParamsLoss.year.start 
  + '_' + changeParamsLoss.year.end 
  + '_' + 'SAMZguidance' 
  + '_' + runVersion; 

Export.image.toAsset({
  image: strataLoss, 
  description: descriptionLoss, 
  assetId: baseOutFolder+descriptionLoss, 
  region: aoi, 
  scale: 30 
});

var fileNameLoss = dealName + '_' + reportYear + '_' + changeParamsLoss.delta + '_comboMask';
Export.image.toDrive({
  image: strataLoss, 
  description: descriptionLoss, 
  fileNamePrefix: fileNameLoss, 
  region: aoi, 
  scale: 30
});


/* Gain */

var changeParamsGain = samzParams2.changeParamsGain; // Cambio realizado por Jorge
// add index to changeParams object
changeParamsGain.index = indexChange;

var metadataGain = {
  CollectionParams_startYear:startYear,
  CollectionParams_endYear:endYear,
  CollectionParams_startDay:startDay,
  CollectionParams_endDay:endDay,
  CollectionParams_aoi:aoi,
  CollectionParams_index:indexChange,
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
print('changeImg Gain', changeImgGain);

// TerraBio-specific strata classification

//For gain, more simple than for loss categorization of deforestation/degredation 
// gain = 1 
// and match everything same as Loss strata image
var strataGain = changeImgGain.select('yod').neq(0).rename('remapped')
  .addBands(changeImgGain)
  .short()
  //lost during strata calc
  .set(metadataGain); 

print('strataGain', strataGain);

// Visualize gain results 

var strataVisGain = {palette:paletteGain};
Map.addLayer(strataGain.select('remapped'), strataVisGain, 'Gain', false);


// Export gain asset

var descriptionGain = 'lt_' + changeParamsGain.delta
  + '_' + changeParamsGain.sort
  + '_'+ changeParamsGain.year.start 
  + '_' + changeParamsGain.year.end 
  + '_' + 'SAMZguidance' 
  + '_' + runVersion2; 

Export.image.toAsset({
  image: strataGain, 
  description: descriptionGain, 
  assetId: baseOutFolder + descriptionGain, 
  region: aoi, 
  scale: 30, 
});

var fileNameGain = changeParamsGain.delta + '_' + dealName + '_' + reportYear;
Export.image.toDrive({
  image: strataGain, 
  description: descriptionGain, 
  fileNamePrefix: fileNameGain, 
  region: aoi, 
  scale: 30, 
});

var empty = ee.Image().byte();

var outlineFarms = empty.paint({
  featureCollection: farms,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms');

var outlineReference = empty.paint({
  featureCollection: reference,
  color: 1,
  width: 2
});
Map.addLayer(outlineReference, {palette: paletteCiat.colors.colorReference}, 'Reference');

var outlineInterventions = empty.paint({
  featureCollection: interventions,
  color: 1,
  width: 2
});
Map.addLayer(outlineInterventions, {palette: paletteCiat.colors.colorIntervention}, 'Interventions');



