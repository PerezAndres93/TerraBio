// -------------------------------------------------------------------------------
// Creates a combination forest/non-forest masks from NICFI & Mapbiomas masks
// Authors: Dawn Nekorchuk
// Description:  
//    Forest/non-forest mask was created using an overlay of the MapBiomas & NICFI masks
//      where if EITHER had a pixel as forest, then it was designated as forest. 
//    This lets us use the local knowledge MapBiomas, but improves the forest underestimation
//      (as seen in Horta) using the NICFI mask. This also reduces any salt&pepper effect from 
//      the NICFI classifier. 
//    Exports it as bands in an image (like FNF for MapBiomas and NICFI).
//    Used in landtrendr change LOSS stratification.
// Last updated & by: 2023-08-22 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-08-22: Replaced regex filtering of bands with standardized band name function.
//             Changed name of Hansen long FNF layer. -vmachuca
// 2023-08-21: Added in Hansen F/NF layer to NCFI/MapBiomas long F/NF layer. -vmachuca
// 2023-08-11: Exported NICFI and MapBiomas combo FNF mask. Brougth in NICFI and MapBiomas params. 
//             Note that there's really no way to programmatise the subsetting for long FNF mask creation as it is currently done.
//             Hansen parameters may change in the future, if they add post-2012 gain. -vmachuca
// 2023-08-10: Generated 1985-2021 MapBiomas and NICFI combo mask. Hard-coded pieces need to be updated. -vmachuca
// 2023-05-17: Creation -dnekorchuk
// -------------------------------------------------------------------------------
// Tags (control F to jump to tagged places):
// !!! = areas to update for future deals
//
// -------------------------------------------------------------------------------


//======================================================//
//              Parameters and Imports                  //
//======================================================//

//Workload tags 
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.hortaTag);

//Geometries and parameters
var gp = require('users/ingperezescobar/TerraBio_final:horta/2023/geometries parameters');
var aoi = gp.layers.aoi;
var farms = gp.layers.farms; //for visualization
var studyStartYear = gp.params.studyStartYear;
var studyEndYear = gp.params.studyEndYear;

var nicfiEndYear = gp.layers.nicfiEndYear; //for visual comparison

var nicfiStartYear = gp.params.nicfiStartYear; //2015
var mapbiomasStartYear = gp.params.startYear; //1985
var hansenStartYear = gp.params.hansenStartYear; //2000

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

//2017-2021 FNF masks 
var fnfMapbiomas = ee.Image(
  baseDataFolder + 'ForestMasks/mapbiomasFNF_yearly_' + studyStartYear + '-' + studyEndYear); 

var fnfNicfi = ee.Image(
  baseDataFolder + 'ForestMasks/nicfiFNF_yearly_' + studyStartYear + '-' + studyEndYear); 

//long term FNF masks
var fnfMapbiomasLong = ee.Image(
  baseDataFolder + 'ForestMasks/mapbiomasFNF_yearly_' + mapbiomasStartYear + '-' + studyEndYear); 
//print("fnfMapbiomasLong",fnfMapbiomasLong);

var fnfNicfiLong = ee.Image(
  baseDataFolder + 'ForestMasks/nicfiFNF_yearly_' + nicfiStartYear + '-' + studyEndYear); 
//print("fnfNicfiLong",fnfNicfiLong);  

var fnfHansenLong = ee.Image(
  baseDataFolder + 'ForestMasks/hansenFNF_yearly_' + hansenStartYear + '-' + studyEndYear); 
//print("fnfHansenLong",fnfHansenLong);

//======================================================//
//         Create 2017-2021 Combination Mask           //
//======================================================//

//Note: Same number of bands (which are named the same), important for .add()
// Add bands: 0 where both nonforest, 1 where one is forest, 2 where both are forest
var fnfAdded = fnfMapbiomas.add(fnfNicfi);
Map.addLayer(fnfAdded,{},"fnfAdded")
//  Reclassify to 0 (0) and 1 (1 or 2) -- forest where EITHER or both are marked forest
var bandList = fnfAdded.bandNames();
var fnfComboCol = ee.ImageCollection.fromImages(
  bandList.map(function(band){
  //remap only works with single bands, so mapping over bandname list
  return fnfAdded.remap({
    from: [0,1,2,3],
    to:   [0,1,1,1],
    bandName: band
  }).rename([band]); //otherwise all are 'remapped'
})); 

var fnfCombo = fnfComboCol.toBands()
  //toBands alters names, so rename
  .rename(bandList); 
//print('combo', fnfCombo); 

//print('2017-2022 fnfCombo',fnfCombo);

//======================================================//
//        Create 1985-2021 MapBiomas+NICFI Layer        //
//======================================================//

// DESCRIPTION: 
// The NICFI and MapBiomas FNF layers do not have the same number of bands given that
// NICFI starts in 2015 (and there is a band for each year - 'fnf1985', etc.) Thus, we 
// first combine the NICFI layer with MapBiomas FNF filtered to 2015-2021.

// list of bands in MabBiomas FNF layer to select
var yrList = ee.List.sequence(nicfiStartYear,studyEndYear).getInfo();
var bn = yrList.map(function(yr){
  var bnYr = ee.String('fnf'+yr);
  return bnYr
});

// Note: Same number of bands (which are named the same), important for .add(). This is why
// we add 2015-2021 MapBioms to NICFI (which only goes from 2015 to 2021). 
/// Add bands: 0 where both nonforest, 1 where one is forest, 2 where both are forest
var fnfAdded2015to2021 = fnfNicfiLong.add(fnfMapbiomasLong.select(bn));
//print('fnfAdded2015to2021',fnfAdded2015to2021);

//  Reclassify to 0 (0) and 1 (1 or 2) -- forest where EITHER or both are marked forest
var bandList2015to2021 = fnfAdded2015to2021.bandNames();

var fnfComboCol2015to2021 = ee.ImageCollection.fromImages(
  bandList2015to2021.map(function(band){
  //remap only works with single bands, so mapping over bandname list
  return fnfAdded2015to2021.remap({
    from: [0,1,2,3],
    to:   [0,1,1,1],
    bandName: band
  }).rename([band]); //otherwise all are 'remapped'
})); 

var fnfCombo2015to2021 = fnfComboCol2015to2021.toBands()
  //toBands alters names, so rename
  .rename(bandList2015to2021); 

//print('fnfCombo2015to2021',fnfCombo2015to2021); 

var yrList = ee.List.sequence(mapbiomasStartYear,nicfiStartYear-1).getInfo();
var bn = yrList.map(function(yr){
  var bnYr = ee.String('fnf'+yr);
  return bnYr
});
  
//append 1985-2014 MapBiomas FNF to the 2015-2021 combo FNF layer above
var fnfMapbiomas1985to2014 = fnfMapbiomasLong.select(bn);
//print('fnfMapbiomas1985to2014',fnfMapbiomas1985to2014);

var fnfComboLongMN = fnfMapbiomas1985to2014.addBands(fnfCombo2015to2021);
  
//print('MapBiomas and NICFI 1985-2021 combo', fnfComboLongMN); 

//======================================================//
//                Add Hansen FNF Layer                  //
//======================================================//

// DESCRIPTION: 
// The Hansen F/NF layer spans 2000-2021. So, like above, we append the Hansen layer to the 
// NICFI/MapBiomas layer filtered to 2000-2021.


var yrList = ee.List.sequence(hansenStartYear,studyEndYear).getInfo();
var bn = yrList.map(function(yr){
  var bnYr = ee.String('fnf'+yr);
  return bnYr
});

// Note: Same number of bands (which are named the same), important for .add(). This is why
// we add 2000-2021 Hansen to the MapBiomas/NICFI combo. 
/// Add bands: 0 where both nonforest, 1 where one is forest, 2 where both are forest
var fnfAdded2000to2021 = fnfHansenLong.add(fnfComboLongMN.select(bn));
//print('fnfAdded2000to2021', fnfAdded2000to2021);

//generate list of bands names
var bandList2000to2021 = fnfAdded2000to2021.bandNames();
//print('bandList2000to2021', bandList2000to2021);

//  Reclassify to 0 (0) and 1 (1 or 2) -- forest where EITHER or both are marked forest
var fnfComboCol2000to2021 = ee.ImageCollection.fromImages(
  bandList2000to2021.map(function(band){
  //remap only works with single bands, so mapping over bandname list
  return fnfAdded2000to2021.remap({
    from: [0,1,2],
    to:   [0,1,1],
    bandName: band
  }).rename([band]); //otherwise all are 'remapped'
})); 

var fnfCombo2000to2021 = fnfComboCol2000to2021.toBands()
  //toBands alters names, so rename
  .rename(bandList2000to2021); 

//print('fnfCombo2000to2021',fnfCombo2000to2021);  

var yrList = ee.List.sequence(mapbiomasStartYear,hansenStartYear-1).getInfo();
var bn = yrList.map(function(yr){
  var bnYr = ee.String('fnf'+yr);
  return bnYr
});
  
//append 1985-1999 MapBiomas/NICFI FNF layer to the 2000-2021 combo FNF layer above
var fnfMapbiomas1985to1999 = fnfMapbiomasLong.select(bn);
//print('fnfMapbiomas1985to1999',fnfMapbiomas1985to1999);

//I cast the bands to be of data type "unsigned int16" just to keep all bands of the same data type
// This may or may not need to be changed in the future. My selection of int16 in particula was 
// somewhat arbitrary.
var fnfComboLong = fnfMapbiomas1985to1999.addBands(fnfCombo2000to2021).toUint16(); 
  
//print('1985-2021 Hansen/MapBiomas/NICFI Combo', fnfComboLong); 


// //======================================================//
// //              Visualize, If Needed                    //
// //======================================================//

Map.centerObject(aoi, 11);

// var vis = {
//   'bands':["R","G","B"],
//   'min':64,
//   'max':5454,
//   'gamma':1.8
// };
// Map.addLayer(nicfiEndYear, vis, studyEndYear+'-07 NICFI mosaic');

var pal = {min:0, max:1, palette:['grey','green']};
// Map.addLayer(fnfMapbiomas.select('fnf'+studyEndYear), pal, 'FNF mapbiomas '+studyEndYear, false);
//Map.addLayer(fnfNicfi.select('fnf'+studyEndYear), pal, 'FNF NICFI '+studyEndYear, false);
//Map.addLayer(fnfCombo.select('fnf'+studyEndYear), pal, 'FNF Combo '+studyEndYear, false);
Map.addLayer(fnfComboLong.select('fnf'+studyEndYear), pal, '1985-2022 FNF Combo '+studyEndYear, false);

for(var i = 2017; i < 2023; i++){
  var maskLabel = 'forest mask ' + i.toString();
  Map.addLayer(fnfComboLong.select('fnf'+i),{"min":0,"max":1},maskLabel, false);
}

// var empty = ee.Image().byte();
// var outlineFarms = empty.paint({
//   featureCollection: farms,
//   color: 1,
//   width: 2
// });
// Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms');



// //======================================================//
// //                  Export Combo Mask                   //
// //======================================================//

var outString = baseDataFolder + 'ForestMasks/comboFNF_yearly_' + studyStartYear+'-' + studyEndYear;
//print(outString);

//var outStringLong = baseDataFolder + 'ForestMasks/comboNicfiMapbiomasFNF_yearly_' + mapbiomasStartYear + '-' + studyEndYear;
var outStringLong = baseDataFolder + 'ForestMasks/comboFNF_yearly_' + mapbiomasStartYear + '-' + studyEndYear;
//print(outStringLong);

Export.image.toAsset({
  image: fnfCombo, 
  description: 'comboFNF_yearly_' + studyStartYear + '-' + studyEndYear, 
  assetId: outString, 
  pyramidingPolicy: 'mode', 
  dimensions: null, 
  region: aoi, 
  scale: 30, 
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});

Export.image.toAsset({
  image: fnfComboLong, 
  description: 'comboFNF_yearly_' + mapbiomasStartYear + '-' + studyEndYear, 
  assetId: outStringLong, 
  pyramidingPolicy: 'mode', 
  dimensions: null, 
  region: aoi, 
  scale: 30, 
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});
