// -------------------------------------------------------------------------------
// LandTrendr newest loss and gain (separate); with combination forest mask for loss strata
// Authors(SIG-version): Hayley Pippin, Kyle Woodward, Andréa Nicolau, Dawn Nekorchuk
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
//   Exports to asset (or drive) the gain and loss strata image. 
//    The data dictionary and 'geometries parameters' module should be updated afterwards.
// Last updated & by: 2023-05-18 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-11-02: Copied from Café Apui -vmachuca

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
// !!! = places to change per deal
// !*! = under construction, questions
// -------------------------------------------------------------------------------


//======================================================//
//                 Parameters and Imports               //
//======================================================//

//Workload tags 
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.hortaTag);

//Geometries and parameters



var gp = require('users/ingperezescobar/TerraBio_final:horta/2024/geometries parameters');
var aoi = gp.layers.aoi;
var farms = gp.layers.farms; //for visualization
var reference = gp.layers.reference; //for visualization
var intervention = gp.layers.intervention; //for visualization
var interventions = gp.layers.interventions;
var studyStartYear = gp.params.studyStartYear; 
var studyEndYear = gp.params.studyEndYear;
var dealName = gp.params.dealName;
var counterfactual = ee.FeatureCollection('users/ingperezescobar/TerraBio/Horta/data/2023/counterfactuals_20230831')
var farms_union = counterfactual.merge(farms)


var nicfi2018 = gp.layers.nicfi2018; //for visual comparison
var nicfi2022 = gp.layers.nicfi2022; //for visual comparison
var visNicfi = {"bands":["R","G","B"],"min":64,"max":5454,"gamma":1.8};
// Map.addLayer(nicfi2022, visNicfi, "nicfi2022")
//Map.addLayer(nicfi2018, visNicfi, "nicfi2018")


//Landtrendr params
var startYear = gp.params.startYear;
var endYear = gp.params.endYear;
var startDay = gp.params.startDay;
var endDay = gp.params.endDay;
var maskThese = gp.params.maskThese;
var samzParams_gain = gp.params.samzNeutral_jorge_gain; // original: samzNeutral ; samzNeutral_jorge ; 
var runVersion_gain = samzParams_gain.runVersion;
var runParams_gain = samzParams_gain.runParams;
var samzParams_loss = gp.params.samzNeutral; // original: samzNeutral ; samzNeutral_jorge ; 
var runVersion_loss = samzParams_loss.runVersion;
var runParams_loss = samzParams_loss.runParams;

var index = gp.params.indexChange; 
print(index);

// loss and gain parameters - using change parameters, then assigning carbon index (NDFI) and start year (1985)
var changeParamsLoss = samzParams_loss.changeParamsLoss;
changeParamsLoss.index = index;

var changeParamsGain = samzParams_gain.changeParamsGain; 
changeParamsGain.index = index;

//Other params
var baseOutFolder = gp.params.baseOutputFolder;
var baseDataFolder = gp.params.baseDataFolder;

var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors 
var paletteLoss = paletteCiat.colors.paletteLoss; 
var paletteGain = paletteCiat.colors.paletteGain; 


// FNF study start year-study end year
var fnfCombo = ee.Image(
  baseDataFolder + 'ForestMasks/comboFNF_yearly_' + studyStartYear + '-' + studyEndYear); 

var fnfEnd = fnfCombo.select('fnf'+studyEndYear);
var fnfpreEnd = fnfCombo.select('fnf'+ (studyEndYear-1));


// load the LandTrendr.js module
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

print('baseOutFolder + descriptionGain',baseOutFolder + descriptionGain);


//======================================================//
//                  Run LandTrendr                      //
//======================================================//

//https://emapr.github.io/LT-GEE/running-lt-gee.html
// from module exports.runLT = function(startYear, endYear, startDay, endDay, 
//                          aoi, index, ftvList, runParams, maskThese, exclude)
var lt_loss = ltgee.runLT(startYear, endYear, startDay, endDay,
                      aoi.geometry(), index, [], runParams_loss, maskThese);
print('lt_loss', lt_loss); 

var lt_gain = ltgee.runLT(startYear, endYear, startDay, endDay,
                      aoi.geometry(), index, [], runParams_gain, maskThese);
print('lt_gain', lt_gain); 

//======================================================//
//                  Loss                                //
//======================================================//


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
  runParams_loss_maxSegments: runParams_loss.maxSegments,
  runParams_loss_spikeThreshold: runParams_loss.spikeThreshold,
  runParams_loss_vertexCountOvershoot: runParams_loss.vertexCountOvershoot,
  runParams_loss_preventOneYearRecovery: runParams_loss.preventOneYearRecovery,
  runParams_loss_recoveryThreshold: runParams_loss.recoveryThreshold,
  runParams_loss_pvalThreshold: runParams_loss.pvalThreshold,
  runParams_loss_bestModelProportion: runParams_loss.bestModelProportion,
  runParams_loss_minObservationsNeeded: runParams_loss.minObservationsNeeded
};
print('metadataLoss',metadataLoss);

// Get the change map layers
var changeImgLoss = ltgee.getChangeMap(lt_loss, changeParamsLoss).set(metadataLoss);
print('changeImgLoss', changeImgLoss);
Map.addLayer(changeImgLoss.clip(farms_union),imageVisParam,"changeImgLoss")
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


// forest during all the years 
var studyNumYears = studyEndYear - studyStartYear; //years are inclusive when counting, so plus one 
print('Number of years in change analysis', studyNumYears);

// var last3years = ['fnf'+ (studyEndYear - 2), 'fnf'+ (studyEndYear - 1), 'fnf'+ (studyEndYear)] // Modificado porjorge
// print("last3years",last3years)


var forestAllYears = fnfCombo//.select(last3years)
      .reduce(ee.Reducer.sum())
      .gte(4)
      .rename('forest_all_years');

var forestAnyYears = fnfCombo//.select(last3years)
      .reduce(ee.Reducer.sum())
      .eq(0)
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
  .where(forestAnyYears.eq(1),4)
  //.where((fnfpreEnd.updateMask(fnfpreEnd.eq(1)).add(fnfEnd.updateMask(fnfEnd.eq(0)))).eq(2) ,1)
  .remap([0,1,2,4],[3,1,2,4]) // disturbed + nonforest at end = deforestation >> 3.
  .rename('dist')
  .select('dist')
  .unmask(); // unmasking (non-disturbance areas) to add to the nondist img above.


print("dist",dist)


// var dist = changeImgLoss
//   .not() // making non disturbed areas 1 and disturbed 0.
//   .select('yod') // selecting one band.
//   .where(fnfEnd,2) // disturbed + forest at end = degradation >> 2.
//   .remap([0,2],[3,2]) // disturbed + nonforest at end = deforestation >> 3.
//   .rename('dist')
//   .select('dist')
//   .unmask(); // unmasking (non-disturbance areas) to add to the nondist img above.

var strataLoss = dist.add(nondist)
  .rename('remapped')
  .addBands(changeImgLoss)
  .short()
  //lost during strata calc
  .set(metadataLoss); 
print('strataLoss', strataLoss);

// var strataLossLastYear = strataLoss.select('remapped')
// var mask1 = (changeImgLoss.select(['yod']).lt(2023))
// mask1 = (mask1.updateMask(mask1.eq(1))).remap([1],[4])




/* Visualize loss */

//Map.centerObject(aoi, 12);

//TerraBio stratified results
var strataVisLoss = {min:1,max:4,palette:paletteLoss};
Map.addLayer(strataLoss.clip(farms_union).select('remapped').clip(farms_union), strataVisLoss, 'Loss', false);
// Map.addLayer(mask1,{},"mask1", false)

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


var pal = {min:0, max:1, palette:['black','green']};
Map.addLayer(fnfCombo.select('fnf2017'), pal, 'FNF Combo 2017' ,false);
Map.addLayer(fnfCombo.select('fnf2018'), pal, 'FNF Combo 2018', false);
Map.addLayer(fnfCombo.select('fnf2019'), pal, 'FNF Combo 2019', false);
Map.addLayer(fnfCombo.select('fnf2020'), pal, 'FNF Combo 2020', false);
Map.addLayer(fnfCombo.select('fnf2021'), pal, 'FNF Combo 2021', false);
Map.addLayer(fnfCombo.select('fnf2022'), pal, 'FNF Combo 2022', false);
Map.addLayer(fnfCombo.select('fnf2023'), pal, 'FNF Combo 2023', false);

/* Export Loss asset */ 

var descriptionLoss = 'lt_' + changeParamsLoss.delta 
  + '_' + 'comboMask' 
  + '_' + changeParamsLoss.sort
  + '_' + changeParamsLoss.year.start 
  + '_' + changeParamsLoss.year.end 
  + '_' + 'SAMZguidance' 
  + '_' + runVersion_loss; 

Export.image.toAsset({
  image: strataLoss, 
  description: descriptionLoss, 
  assetId: baseOutFolder + descriptionLoss, 
  region: aoi, 
  scale: 30 
  // crs: 'EPSG:5070', 
  //maxPixels: 1e13
});


var fileNameLoss = dealName + '_' + studyEndYear + '_' + changeParamsLoss.delta + '_comboMask';
Export.image.toDrive({
  image: strataLoss, 
  description: descriptionLoss, 
  fileNamePrefix: fileNameLoss, 
  region: aoi, 
  scale: 30
});


//======================================================//
//                  Gain                                //
//======================================================//


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
  runParams_gain_maxSegments: runParams_gain.maxSegments,
  runParams_gain_spikeThreshold: runParams_gain.spikeThreshold,
  runParams_gain_vertexCountOvershoot: runParams_gain.vertexCountOvershoot,
  runParams_gain_preventOneYearRecovery: runParams_gain.preventOneYearRecovery,
  runParams_gain_recoveryThreshold: runParams_gain.recoveryThreshold,
  runParams_gain_pvalThreshold: runParams_gain.pvalThreshold,
  runParams_gain_bestModelProportion: runParams_gain.bestModelProportion,
  runParams_gain_minObservationsNeeded: runParams_gain.minObservationsNeeded  ,
};

// Get the change map layers for gain
var changeImgGain = ltgee.getChangeMap(lt_gain, changeParamsGain).set(metadataGain);
print('changeImg Gain', changeImgGain);

// var last4years = ['fnf'+ (studyEndYear - 3),'fnf'+ (studyEndYear - 2), 'fnf'+ (studyEndYear - 1), 'fnf'+ (studyEndYear)] // Modificado porjorge
// print("last4years",last4years)


// var forestAllYears2 = last4years
//       .reduce(ee.Reducer.sum())
//       .gte(4)
//       .rename('forest_all_years');     

changeImgGain = changeImgGain.updateMask(forestAllYears.eq(0))

Map.addLayer(changeImgGain.clip(farms_union),imageVisParam,"changeImgGain")

// TerraBio-specific strata classification

//For gain, more simple than for loss categorization of deforestation/degredation 
// gain = 1 
// and match everything same as Loss strata image




var strataGain = changeImgGain
  .select('yod').neq(0)
  //lost during strata calc
  .set(metadataGain); 

strataGain = strataGain.updateMask(forestAllYears.eq(0)).rename(['remapped'])
                       .addBands(changeImgGain).short()
print('strataGain', strataGain);



// Visualize gain results 

var strataVisGain = {palette:paletteGain};
Map.addLayer(strataGain.clip(farms_union).select('remapped'), strataVisGain, 'Gain', true);


// Export gain asset

var descriptionGain = 'lt_' + changeParamsGain.delta
  + '_' + changeParamsGain.sort
  + '_'+ changeParamsGain.year.start 
  + '_' + changeParamsGain.year.end 
  + '_' + 'SAMZguidance' 
  + '_' + runVersion_gain; 

Export.image.toAsset({
  image: strataGain, 
  description: descriptionGain, 
  assetId: baseOutFolder + descriptionGain, 
  region: aoi, 
  scale: 30, 
  // crs: 'EPSG:5070', 
  //maxPixels: 1e13
});


var fileNameGain = changeParamsGain.delta + '_' + dealName + '_' + studyEndYear;
Export.image.toDrive({
  image: strataGain, 
  description: descriptionGain, 
  fileNamePrefix: fileNameGain, 
  region: aoi, 
  scale: 30, 
});


//======================================================//
//                 Code Parking Lot                     //
//======================================================//
// //old image collection 
// var fnfNicfi = ee.ImageCollection(
//   'projects/servir-amazonia/TerraBio/CafeApui/data/2022/ForestMasks/NICFI_FNF_2017_2021');
// //Filter collection to just the end year and extract it with first()
// var fnfEnd = fnfNicfi.filter(ee.Filter.eq('year', endYear)).first();

var empty = ee.Image().byte();
// Paint all the polygon edges with the same number and width, display.

//aoi bounding
var outlineAoi = empty.paint({
  featureCollection: aoi,
  color: 1,
  width: 2
});
Map.addLayer(outlineAoi, {palette: paletteCiat.colors.colorAoi}, 'AOI'); 

//farms
// when mapping land uses, put farms on bottom
//    when doing undesigned comment out here and uncomment just before that one
// var outlineFarms = empty.paint({
//   featureCollection: farms,
//   color: 1,
//   width: 2
// });
// Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms'); 

var outlineFarmsCounter = empty.paint({
  featureCollection: farms_union,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarmsCounter, {palette: paletteCiat.colors.colorFarm}, 'Counter_farms'); 


var outlineFintervention = empty.paint({
  featureCollection: interventions,
  color: 1,
  width: 2
});
Map.addLayer(outlineFintervention, {palette: paletteCiat.colors.colorIntervention}, 'Intervention');

// //forest reference
// var outlineForest = empty.paint({
//   featureCollection: reference,
//   color: 1,
//   width: 2
// });
// Map.addLayer(outlineForest, {palette: paletteCiat.colors.colorReference}, 'Reference Forest'); //lt blue CIAT



//########################################################################################################
//##### FUNCTIONS FOR EXTRACTING AND PLOTTING A PIXEL TIME SERIES ##### 
//########################################################################################################

var long = -48.088214600049795;
var lat = -1.1916403053966809;
var long2 = -48.0879237490573; 
var lat2 = -1.192268065242032;



var distDir = -1; // define the sign of spectral delta for vegetation loss for the segmentation index - 
                  // NBR delta is negetive for vegetation loss, so -1 for NBR, 1 for band 5, -1 for NDVI, etc
var aoi1 = ee.Geometry.Point(long, lat);


// ----- FUNCTION TO GET LT DATA FOR A PIXEL -----
var getPoint = function(img, geom, z) {
  return img.reduceRegion({
  reducer: 'first',
  geometry: geom,
  scale: z
  }).getInfo();
};


// ----- FUNCTION TO CHART THE SOURCE AND FITTED TIME SERIES FOR A POINT -----
var chartPoint = function(lt, pt, distDir) {
  //Map.centerObject(pt, 14);
  Map.addLayer(pt, {color: "green"});
  var point = getPoint(lt, pt, 10);
  var data = [['x', 'y-original', 'y-fitted']];
  var pixelTimeSeriesData = ltgee.ltPixelTimeSeriesArray(lt, pt, distDir);
  
  for (var i = 0; i <= (endYear-startYear); i++) {
    data = data.concat([[point.LandTrendr[0][i], point.LandTrendr[1][i]*distDir, point.LandTrendr[2][i]*distDir]]);
  }
  print(ui.Chart(data, 'LineChart',
            {
              'title' : '(loss pt1) Index: '+index + ' | Fit RMSE: '+ (Math.round(pixelTimeSeriesData.rmse * 100) / 100).toString(),
              'hAxis': 
                {
                  'format':'####'
                },
              'vAxis':
                {
                  'maxValue': 1000,
                  'minValue': -1000   
                }
            },
            {'columns': [0, 1, 2]}
          )
        );
};

//----- PLOT THE SOURCE AND FITTED TIME SERIES FOR THE GIVEN POINT -----
chartPoint(lt_gain, aoi1, distDir); // plot the x-y time series for the given point



var aoi2 = ee.Geometry.Point(long2, lat2);

// ----- FUNCTION TO CHART THE SOURCE AND FITTED TIME SERIES FOR A POINT -----
var chartPoint2 = function(lt_loss, pt, distDir) {
  //Map.centerObject(pt, 14);
  Map.addLayer(pt, {color: "FF0000"});
  var point = getPoint(lt_loss, pt, 10);
  var data = [['x', 'y-original', 'y-fitted']];
  var pixelTimeSeriesData = ltgee.ltPixelTimeSeriesArray(lt_loss, pt, distDir);
  
  for (var i = 0; i <= (endYear-startYear); i++) {
    data = data.concat([[point.LandTrendr[0][i], point.LandTrendr[1][i]*distDir, point.LandTrendr[2][i]*distDir]]);
  }
  print(ui.Chart(data, 'LineChart',
            {
              'title' : '(Loss pt2) Index: '+index + ' | Fit RMSE: '+ (Math.round(pixelTimeSeriesData.rmse * 100) / 100).toString(),
              'hAxis': 
                {
                  'format':'####'
                },
              'vAxis':
                {
                  'maxValue': 1000,
                  'minValue': -1000   
                }
            },
            {'columns': [0, 1, 2]}
          )
        );
};

//----- PLOT THE SOURCE AND FITTED TIME SERIES FOR THE GIVEN POINT -----
chartPoint2(lt_gain, aoi2, distDir); // plot the x-y time series for the given point