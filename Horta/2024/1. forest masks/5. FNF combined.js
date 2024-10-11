// -------------------------------------------------------------------------------
// Creates a combination forest/non-forest masks from NICFI & Mapbiomas masks
// Authors: Dawn Nekorchuk, Vanessa Machuca
// Description:  
//    Forest/non-forest mask was created using an overlay of the MapBiomas & NICFI masks
//      where if EITHER had a pixel as forest, then it was designated as forest. 
//    This lets us use the local knowledge MapBiomas, but improves the forest underestimation
//      (as seen in Horta) using the NICFI mask. This also reduces any salt&pepper effect from 
//      the NICFI classifier. 
//    Exports it as bands in an image (like FNF for MapBiomas and NICFI).
//    Used in landtrendr change LOSS stratification.
// Last updated & by: 2023-11-20 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-11-20: Copied over from ReforesTerra year 1 -vmachuca
// -------------------------------------------------------------------------------
// Tags
// !!! = places to change per deal
// !*! = under construction, questions
// -------------------------------------------------------------------------------


//======================================================//
//              Parameters and Imports                  //
//======================================================//

//Workload tags 
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.hortaTag);

//Geometries and parameters
var gp = require('users/ingperezescobar/TerraBio_final:horta/2024/geometries parameters');
var aoi = gp.layers.aoi;
var farms = gp.layers.farms; //for visualization
var studyStartYear = gp.params.studyStartYear;
print("studyStartYear",studyStartYear)
var studyEndYear = gp.params.studyEndYear;
print("studyEndYear",studyEndYear)
var nicfiStartYear = gp.params.nicfiStartYear;
print("nicfiStartYear",nicfiStartYear)
var mapbiomasStartYear = gp.params.startYear;
print("mapbiomasStartYear",mapbiomasStartYear)
var hansenStartYear = gp.params.hansenStartYear;
print("hansenStartYear",hansenStartYear)

var nicfiEndYear = gp.layers.nicfi2022; //for visual comparison


var baseDataFolder = gp.params.baseDataFolder;

var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors 
var paletteLoss = paletteCiat.colors.paletteLoss; 
var paletteGain = paletteCiat.colors.paletteGain; 


//======================================================//
//                Style of visualization                //
//======================================================//

var fnf_vis = {min:0, max:1, palette:['black','green']};



//======================================================//
//                         Imagery                      //
//======================================================//
// Reminder: 
// var paletteLoss = [paletteCiat.colors.colorStableForest, //1, stable forest
//                     paletteCiat.colors.colorDegradation, //2, degradation
//                     paletteCiat.colors.colorDeforestation, //3, deforestation
//                     paletteCiat.colors.colorBackground]; //4, non-forest 
// var paletteGain = [paletteCiat.colors.colorGain]; //1, gain

//study start year - study end year FNF masks 
var fnfMapbiomas = ee.Image(
  baseDataFolder + 'ForestMasks/mapbiomasFNF_yearly_' + mapbiomasStartYear + '-' + studyEndYear); 
fnfMapbiomas = fnfMapbiomas.select(['fnf2017','fnf2018','fnf2019','fnf2020','fnf2021','fnf2022','fnf2023'])


var fnfNicfi = ee.Image(
  baseDataFolder + 'ForestMasks/nicfiFNF_yearly_2017' + '-' + studyEndYear); 

var fnfMapbiomasLong = ee.Image(
  baseDataFolder + 'ForestMasks/mapbiomasFNF_yearly_' + mapbiomasStartYear + '-' + studyEndYear); 


var fnfNicfiLong = ee.Image(
  baseDataFolder + 'ForestMasks/nicfiFNF_yearly_' + nicfiStartYear + '-' + studyEndYear);  


var fnfHansenLong = ee.Image(
  baseDataFolder + 'ForestMasks/hansenFNF_yearly_' + hansenStartYear + '-' + studyEndYear); 


var fnfHansen = fnfHansenLong.select(['fnf2017','fnf2018','fnf2019','fnf2020','fnf2021','fnf2022','fnf2023'])


var fnfsentinel2 = ee.Image(
  baseDataFolder + 'ForestMasks/sentinel2FNF_yearly_2019' + '-' + studyEndYear); 




//======================================================//
// Create study start year - end year Combination Mask  //
//======================================================//

//Note: Same number of bands (which are named the same), important for .add()
// Add bands: 0 where both nonforest, 1 where one is forest, 2 where both are forest
var S2 = fnfsentinel2



print("S2",S2)

var fnfAdded = fnfMapbiomas.select(["fnf2017","fnf2018"]).addBands(S2);

//  Reclassify to 0 (0) and 1 (1 or 2) -- forest where EITHER or both are marked forest
var bandList = fnfAdded.bandNames();
var fnfComboCol = ee.ImageCollection.fromImages(
  bandList.map(function(band){
  //remap only works with single bands, so mapping over bandname list
  return fnfAdded.remap({
    from: [0,1,2],
    to:   [0,1,1],
    bandName: band
  }).rename([band]); //otherwise all are 'remapped'
})); 
var fnfCombo = fnfComboCol.toBands()
  .rename(bandList); 

print('fnfCombo (Mapbiomas y NICFI): 2019-study end year',fnfCombo);
Map.addLayer(fnfCombo,imageVisParam,"fnfCombo")




//======================================================//
//  Create 1985-study end year MapBiomas + (NICFI+Hansen) Layer    //
//======================================================//

// DESCRIPTION: 
// The NICFI and MapBiomas FNF layers do not have the same number of bands given that
// NICFI starts in 2015 (and there is a band for each year - 'fnf1985', etc.) Thus, we 
// first combine the NICFI layer with MapBiomas FNF filtered to 2015-study end year.

var yrList = ee.List.sequence(mapbiomasStartYear, 2019 - 1).getInfo();
var bn = yrList.map(function(yr){
  var bnYr = ee.String('fnf'+yr);
  return bnYr
});
print("yrList",yrList)
  
//append 1985-2018 MapBiomas FNF to the 2015-study end year combo FNF layer above
var fnfMapbiomas1985to2016 = fnfMapbiomasLong.select(bn);
print("fnfMapbiomas1985to2016",fnfMapbiomas1985to2016)

var fnfcomboshortMBNICFIHansen = fnfCombo//.add(fnfMapbiomas)

var fnfComboLongMN = fnfMapbiomas1985to2016.addBands(fnfcomboshortMBNICFIHansen);
print('fnfCombo (Mapbiomas y NICFI): 1985-study end year',fnfComboLongMN);
Map.addLayer(fnfComboLongMN,{},"fnfComboLongMN")


//  Reclassify to 0 (0) and 1 (1 or 2) -- forest where EITHER or both are marked forest
var bandList2 = fnfComboLongMN.bandNames();
fnfComboLongMN = ee.ImageCollection.fromImages(
  bandList2.map(function(band){
  //remap only works with single bands, so mapping over bandname list
  return fnfComboLongMN.remap({
    from: [0,1,2],
    to:   [0,1,1],
    bandName: band
  }).rename([band]); //otherwise all are 'remapped'
})); 
fnfComboLongMN = fnfComboLongMN.toBands()
  .rename(bandList2); 
  
  

// //======================================================//
// //              Visualize, If Needed                    //
// //======================================================//

// Map.centerObject(aoi, 11);

var vis = {
  'bands':["R","G","B"],
  'min':64,
  'max':5454,
  'gamma':1.8
};
Map.addLayer(nicfiEndYear, vis, 'NICFI mosaic 2022');



//======================================================//
//                  Export Combo Mask                   //
//======================================================//

var outString = baseDataFolder + 'ForestMasks/comboFNF_yearly_' + studyStartYear+'-' + studyEndYear;
//print(outString);

//var outStringLong = baseDataFolder + 'ForestMasks/comboNicfiMapbiomasFNF_yearly_' + mapbiomasStartYear + '-' + studyEndYear;
var outStringLong = baseDataFolder + 'ForestMasks/comboFNF_yearly_' + mapbiomasStartYear + '-' + studyEndYear;
//print(outStringLong);

Export.image.toAsset({
  image: fnfCombo.toInt(), 
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
  image: fnfComboLongMN.toInt(), 
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

