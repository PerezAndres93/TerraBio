// -------------------------------------------------------------------------------
// Create forest/non-forest mask from Mapbiomas
// Input: Requires AOI and various year parameters
// Output: 2 Images with bands for each year, different year ranges 
//     (ForestMasks/mapbiomasFNF_yearly_'+studyStartYear + '-' + studyEndYear) -> change maps
//     (ForestMasks/mapbiomasFNF_yearly_'+startYear + '-' + studyEndYear) -> carbon metric
// Authors: Kyle Woodward, Hayley Pippin, Andréa Nicolau, Dawn Nekorchuk
// Description: Uses Mapbiomas categories to collapse to a forest/nonforest mask.
//  Creates both a study years only version (used in change maps)
//  And one starting from 1985 (used in carbon)
// Last updated & by: 2023-08-08 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-08-08: Added section headers, export current MapBiomas long FNF -vmachuca
// 2023-05-27: Added long-run FNF version -dnekorchuk
// 2023-05-09: Dates in filters are now not hard-coded -dnekorchuk
// 2023-04-19: Finished port to Cafe Apui -dnekorchuk
// 2023-04-17: Started port from Horta to Cafe Apui, -dnekorchuk
// 2023-03-09: Switched to ALL forest classes as export, 
//              updated (2022) data links, -dnekorchuk
// 2023-02-22: Copied 2022 script to 2023 and re-styled/formatted code, 
//              no function changes, added workload tag, -dnekorchuk
// ?         : Added recalc of forest using ALL forest classes by Andrea
// 2022-12-08: Export FNF mask for 1985-2021 by Hayley Pippin
// 2022-05-24: Created script by Kyle Woodward
// -------------------------------------------------------------------------------

//Workload tags
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.apuiTag);

//==============================================//
//        function and data imports             //
//==============================================//

//Mapbiomas
// NEXT RUN for different deal/year - use the newly released 7.1: 
//var mapbiomasLc = ee.Image('projects/mapbiomas-workspace/public/collection7_1/mapbiomas_collection71_integration_v1');
var mapbiomasLc = ee.Image(
  'projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1');
var palettes = require('users/mapbiomas/modules:Palettes.js');
var gp = require('users/ingperezescobar/TerraBio_final:horta/2024/geometries parameters');
var aoi = gp.layers.aoi;
var nicfi2022 = gp.layers.nicfi2022; //for visual comparison

// Params
var studyStartYear = gp.params.studyStartYear;
var studyEndYear = gp.params.studyEndYear;
var baseDataFolder = gp.params.baseDataFolder; 
var longStartYear = gp.params.startYear; //landtrendr start year
var idStringLong = baseDataFolder + 'ForestMasks/mapbiomasFNF_yearly_' + 
                longStartYear + '-' + studyEndYear;



//==============================================//
//                  reclassify                  //
//==============================================//
// Including all forest classes 1.1 Forest. Codes 3, 4, 5, and 49. (Andrea)
// 3 (forest formation), 4 (savanna formation), 5 (mangrove), 49 (Wooded Sandbank Vegetation)
// https://mapbiomas-br-site.s3.amazonaws.com/downloads/Colecction%206/Cod_Class_legenda_Col6_MapBiomas_BR.pdf 
// v7: https://mapbiomas-br-site.s3.amazonaws.com/downloads/_EN__C%C3%B3digos_da_legenda_Cole%C3%A7%C3%A3o_7.pdf

//Function to reclassify forest categories for a list of years
function makeForestReclass(yr) {
  
  var listFmasks = mapbiomasLc
      .select('classification_'+String(yr))
      .remap([3,4,5,49],[1,1,1,1],0)
      .rename('fnf'+String(yr)); 
  
  return listFmasks; 
}



//==============================================//
//          FNF from 1985 to 2021               //
//==============================================//

// for use in carbon calculations (NOT needed for any other metric)

//make list of years to map over
var yearsLong = ee.List.sequence(longStartYear, studyEndYear).getInfo();

//map reclassification function over list of years
var fnfMapbiomasListLong = yearsLong.map(makeForestReclass); 

//make one image with each year FNF as a band
var fnfMapbiomasLong = ee.ImageCollection.fromImages(fnfMapbiomasListLong)
    .toBands()
    //this band name matches the other forest masks for consistency
    .rename(yearsLong.map(function (y){return 'fnf'+y}));
print('fnfMapbiomasLong', fnfMapbiomasLong); 



Export.image.toAsset({
  image: fnfMapbiomasLong, 
  description: 'Mapbiomas_FNFmasks_long', 
  assetId: idStringLong, 
  pyramidingPolicy: 'mode', 
  dimensions: null, 
  region: aoi, 
  scale: 30, //collection 7 resolution
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});




//==============================================//
//          FNF from 2017 to 2023               //
//==============================================//


//Make list of study years to map over
var years = ee.List.sequence(studyStartYear, studyEndYear).getInfo();

var fnfMapbiomasList = years.map(makeForestReclass); 

var fnfMapbiomasYearly = ee.ImageCollection.fromImages(fnfMapbiomasList)
    .toBands()
    //this band name matches the NICFI forest mask, also used in landtrendr combo
    .rename(years.map(function (y){return 'fnf'+y}));
print('fnfMapbiomasYearly', fnfMapbiomasYearly); 


var idString = baseDataFolder + 'ForestMasks/mapbiomasFNF_yearly_' + 
                studyStartYear + '-' + studyEndYear;
print(idString);

Export.image.toAsset({
  image: fnfMapbiomasYearly, 
  description: 'Mapbiomas_FNFmasks', 
  assetId: idString, 
  pyramidingPolicy: 'mode', 
  dimensions: null, 
  region: aoi, 
  scale: 30, //collection 7 resolution
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});

//==============================================//
//                  VISUALIZATION               //
//==============================================//

Map.centerObject(aoi, 13);

var vis = {'bands':['R', 'G', 'B'],'min': 64,'max': 5454,'gamma': 1.8};
Map.addLayer(nicfi2022, vis, studyEndYear+' mosaic');
Map.addLayer(fnfMapbiomasLong.select('fnf2022'),{},"fnf2022")
Map.addLayer(fnfMapbiomasLong.select('fnf2022'),{},"fnf2022")