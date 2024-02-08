// -------------------------------------------------------------------------------
// Processing and creation of final land use & boundary layers 
// Authors: SIG
// Description: Any needed processing of land use shapefiles
//  Editing can also occur in QGIS, as needed. 
//  This is not something that is run AS IS every year, just pieces to pick from
//    when needing to clean future years/projects. 
 //NOTE: this all is generally run BEFORE 'geometries parameters' module is / can be updated
//      so these are all hard links and values. 
// Last updated & by: 2023-05-17 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-08-31: Converted all land uses to polygon and re-exported them with 
//                with names ending in "20230831".
//             Generated new farm polygon that includes counterfactual. 
//             Generated allAreas, intervention, and reference polygons with 
//                interpreted points buffers cut out. -vmachuca
// 2023-05-17: Copied from other deal to create Horta 2023 version -dnekorchuk
// -------------------------------------------------------------------------------

// -------------------------------------------------------------------------------
// How to update deal - year 
//
// Make new folders (new year or new deal with appropriate year). 
// COPY scripts (previous year, etc.) into new folder. (Control+drag&drop) 
// Edit 'geometries parameters' to remove all files locations, change deal name/years in other references. 
// In each script update the workload tag (if changing deals) and the 'geometries parameters' reference to the new deal-year. 
// 0. set up / 0. processing: do all the relevant processing and saving for THIS deal-year. 
// And continue on, updating as you go. 
// -------------------------------------------------------------------------------


//<<TO DO>>
// 1. Run ring fix on all Horta land uses and save out for use in 2023 scripts
// 2. Fill out code below and run (exporting results)
// 3. Update data dictionary
// 4. Update 'geometries parameters' module

//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.inocasTag);

//======================================================//
//                     Data Imports                     //
//======================================================//

// Cafe Apui
var gp = require('users/ingperezescobar/TerraBio_final:inocas/2023/geometries parameters');
var aoi = gp.layers.aoi;

var farms = gp.layers.farms;
var interventions = gp.layers.interventions; 
var reference = gp.layers.reference;
var farmsUndesignated = gp.layers.farmsUndesignated;
var allAreas = gp.layers.allAreas;



//Function to fix when there are "rings" rather than "polygons", found in some Horta files
//var convertPolygon = function(geom){
//  return ee.Geometry.Polygon(geom.first().geometry().coordinates());
//};
// see farms for example


//=======================================
// Farm
//=======================================

//var farms = ee.FeatureCollection(
//      "users/ingperezescobar/TerraBio/INOCAS/data/2023/farms_20230904"); //EDITED BY JORGE


//* convert to polygon *//
//farms = ee.FeatureCollection(convertPolygon(farms)); // COMMENTED BY JORGE

//print('farms', farms);

//Export to asset
//Export.table.toAsset({
//  collection: farms,
//  description: 'farms_YYYYMMDD',
//  assetId: 'projects/servir-amazonia/TerraBio/INOCAS/data/2023/farms_YYYYMMDD' //EDITED BY JORGE
//});

//Export to shapefile to save to shared drive
//Export.table.toDrive({
//  collection: farms,
//  fileFormat: 'shp',
//  description: 'farms_YYYYMMDD',
//});

//=======================================
// Counterfactual 
//=======================================

//var counterfactuals = ee.FeatureCollection(
//      "projects/servir-amazonia/TerraBio/INOCAS/data/2023/counterfactuals_20240103");//EDITED BY JORGE
  
//* convert to polygon *//
//counterfactuals = ee.FeatureCollection(convertPolygon(counterfactuals));// COMMENTED BY jORGE

//print('counterfactuals', counterfactuals);

//Export to asset
//Export.table.toAsset({
//  collection: counterfactuals,
//  description: 'counterfactuals_YYYYMMDD',
//  assetId: 'projects/servir-amazonia/TerraBio/INOCAS/data/2023/counterfactuals_YYYYMMDD'//EDITED BY JORGE
//});

// //export to shapefile to save to shared drive
// Export.table.toDrive({
//   collection: counterfactuals,
//   fileFormat: 'shp',
//   //description: 'counterfactuals_YYYYMMDD'
//   description: 'counterfactuals_YYYYMMDD'
// });



//=======================================
// Intervention
//=======================================

//var interventions = ee.FeatureCollection(
//      "users/ingperezescobar/TerraBio/INOCAS/data/2023/interventions_20240103");//EDITED BY JORGE
      
      
//* convert to polygon *//
//interventions = ee.FeatureCollection(convertPolygon(interventions));// COMMENTED BY jORGE

//print('interventions', interventions);


//Export to asset
//Export.table.toAsset({
//  collection: interventions,
//  description: 'interventions_YYYYMMDD',
//  assetId: 'projects/servir-amazonia/TerraBio/INOCAS/data/2023/intervention_site2022_YYYYMMDD'//EDITED BY JORGE
//});

// //export to shapefile to save to shared drive
// Export.table.toDrive({
//   collection: interventions,
//   fileFormat: 'shp',
//   //description: 'interventions_YYYYMMDD'
//   description: 'interventions_YYYYMMDD'
// });


//=======================================
// Reference (forest)
//=======================================

//var reference = ee.FeatureCollection(
//      "users/ingperezescobar/TerraBio/INOCAS/data/2023/reference_20240103");//EDITED BY JORGE

//* convert to polygon *//
//reference = ee.FeatureCollection(convertPolygon(reference));// COMMENTED BY jORGE

//print('reference', reference);


//Export to asset
//Export.table.toAsset({
//  collection: reference,
//  description: 'reference_2023YYYYMMDD',
//  assetId: 'projects/servir-amazonia/TerraBio/INOCAS/data/2023/reference_YYYYMMDD'//EDITED BY JORGE
//});

// //export to shapefile to save to shared drive
// Export.table.toDrive({
//   collection: reference,
//   fileFormat: 'shp',
//   //description: 'reference_20230601'
//   description: 'reference_20230831'
// });


//=======================================
// Regeneration
//=======================================

//var regeneration = ee.FeatureCollection(
//  'projects/servir-amazonia/TerraBio/Horta/data/2022/AreaManejo03');

////* convert to polygon *//
//regeneration = ee.FeatureCollection(convertPolygon(regeneration));

//print('regeneration', regeneration);
  
//Export to asset
//Export.table.toAsset({
//  collection: regeneration,
//  description: 'regeneration_YYYYMMDD',
//  assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/regeneration_YYYYMMDD'
//});

// //export to shapefile to save to shared drive
// Export.table.toDrive({
//   collection: regeneration,
//   fileFormat: 'shp',
//   description: 'regeneration_YYYYMMDD'
// });


//=======================================
// Bounding AOI
//=======================================

// <<NOTE>> Can use the one copied from 2022 unless shapefiles change that would affect bounding box. 
//var aoi = ee.FeatureCollection(
//  'users/ingperezescobar/TerraBio/INOCAS/data/2023/full_aoi_20230904');//EDITED BY JORGE


//Create an aoi that is a bounding box around farm AND counterfactual which is outside of farm
//var aoi = farms.merge(counterfactual).geometry().bounds();

// //Export to asset
// Export.table.toAsset({
//   collection: ee.FeatureCollection(aoi),
//   description: 'Horta_full_enclosure_aoi',
//   assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/full_aoi_YYYYMMDD'
// });


//=======================================
// Undesignated farm
//=======================================

//<<TO-DO>> After fixing shapefiles, run and create undesignated. 
//          Update 'geometries parameters' and data dictionary

//*  create undesignated farm  *//
//This cuts out interventions, reference, and regeneration areas out of the farm polygon

//var farmsUndesignated = farms
      //note: mapping over features so can retain properties as oppsed to using .geometry 
//      .map(function (f) { 
//        var matrix = f
//          .difference({'right': interventions.geometry(), 'maxError': 1})
//          .difference({'right': reference.geometry(), 'maxError': 1});
//        return matrix}); 

//* convert to polygon *//
//farmsUndesignated = ee.FeatureCollection(convertPolygon(farmsUndesignated));// COMMENTED BY jORGE

//print('farmsUndesignated', farmsUndesignated);

 //Export to asset
//Export.table.toAsset({
//  collection: farmsUndesignated,
//  description: 'farms_undesignated_YYYYMMDD',
//  assetId: 'projects/servir-amazonia/TerraBio/INOCAS/data/2023/farms_undesignated_YYYYMMDD'//EDITED BY JORGE
//});


//=======================================
// Farm + outside land uses
//=======================================
//Generate a "farm" multipolygon that encompasses the farm and all 
//  land uses outside of the farm (like the counterfactual)

//var allAreas = farms
//      //note: mapping over features so can retain properties as oppsed to using .geometry 
//      .map(function (f) { 
//        var matrix = f
//          .union({'right': interventions.geometry(), 'maxError': 1})
//          .union({'right': reference.geometry(), 'maxError': 1});
//        return matrix}); 

//print('allAreas',allAreas);


//* Export to asset *//
// Export.table.toAsset({
//   collection: allAreas,
//   description: 'allAreas_YYYYMMDD',
//   assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/allAreas_YYYYMMDD'
// });


//=======================================
// NICFI Basemap
//=======================================
//NICFI 2022 as background

var nicfi = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
    //July - September are winter months in Brazil, dry (fewer clouds)
      .filter(ee.Filter.date('2022-07-01','2022-09-30'))
      .first();
      
Export.image.toAsset({
  image: nicfi, 
  description: 'nicfi_inocas_2022_mosaic_clipped', 
  assetId: 'users/ingperezescobar/TerraBio/INOCAS/data/2023/nicfi_2022_mosaic_20240103', //EDITED BY JORGE
  pyramidingPolicy: 'mode', 
  dimensions: null, 
  region: aoi, //don't have to clip in other scripts
  scale: 4.77, 
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});
// Export.image.toDrive({
//   image: nicfi,
//   region: aoi,
//   scale: 4.777314267159966, //borrowed from 2022 Horta
//   maxPixels: 1e13,
//   description: 'nicfi_horta_202207',
//   fileNamePrefix: 'nicfi_horta_202207'
// });


//=========================================
// testing 
//=========================================




var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors


Map.centerObject(farms, 15);

var empty = ee.Image().byte();

//farms
var outlineFarms = empty.paint({
  featureCollection: farms,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms', false); 

//interventions
var outlineInterventions = empty.paint({
  featureCollection: interventions,
  color: 1,
  width: 2
});
Map.addLayer(outlineInterventions, {palette: paletteCiat.colors.colorIntervention}, 'Interventions', false); 

//counterfactual
//var outlineCounterfactual = empty.paint({
//  featureCollection: counterfactuals,
//  color: 1,
//  width: 2
//});
//Map.addLayer(outlineCounterfactual, {palette: paletteCiat.colors.colorCounterfactual}, 'Counterfactual', false); 

//farmsUndesignated
var outlineUndesignated = empty.paint({
  featureCollection: farmsUndesignated,
  color: 1,
  width: 2
});
Map.addLayer(outlineUndesignated, {palette: paletteCiat.colors.colorFarmUndesignated}, 'Undesignated', false); 

//reference
var outlineReference = empty.paint({
  featureCollection: reference,
  color: 1,
  width: 2
});
Map.addLayer(outlineReference, {palette: paletteCiat.colors.colorReference}, 'Reference', false); 

//farm+counterfactual
var outlineFarmAll = empty.paint({
  featureCollection: allAreas,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarmAll, {palette: paletteCiat.colors.colorReference}, 'Farm + Counterfactual', false); 
/** COMMENTED BY JORGE
//allAreasBuffers
var outlineAllAreasBuffers = empty.paint({
  featureCollection: allAreasBuffers,
  color: 1,
  width: 2
});
Map.addLayer(outlineAllAreasBuffers, {palette: 'pink'}, 'allAreasBuffers', false); 

//interventionsBuffers
var outlineInterventionsBuffers = empty.paint({
  featureCollection: interventionsBuffers,
  color: 1,
  width: 2
});
Map.addLayer(outlineInterventionsBuffers, {palette: 'purple'}, 'interventionsBuffers', false); 

//referenceBuffers
var outlineReferenceBuffers = empty.paint({
  featureCollection: referenceBuffers,
  color: 1,
  width: 2
});
Map.addLayer(outlineReferenceBuffers, {palette: 'blue'}, 'referenceBuffers', false); 
**/


/* Printing statistics to Console */

print('Farm boundaries: area ha', ee.Number(farms.geometry().area({maxError: 1000, proj:'EPSG:3857'})).divide(10000));
print('Interventions - ALL: area ha', ee.Number(interventions.geometry().area({maxError: 1000, proj:'EPSG:3857'})).divide(10000));
print('Reference forest: area ha', ee.Number(reference.geometry().area({maxError: 1000})).divide(10000));
//print('Counterfactuals: area ha', ee.Number(counterfactuals.geometry().area({maxError: 1000, proj:'EPSG:3857'})).divide(10000));
print('Farm undesignated: area ha', ee.Number(farmsUndesignated.geometry().area({maxError: 1000, proj:'EPSG:3857'})).divide(10000));
print('AOI: area ha', ee.Number(aoi.geometry().area({maxError: 1000, proj:'EPSG:3857'})).divide(10000));


//==========================================================================
// Check MapBiomas Classes within Farms
//==========================================================================

var mapbiomasLc = ee.Image(
  'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1');
//https://mapbiomas-br-site.s3.amazonaws.com/downloads/_EN__C%C3%B3digos_da_legenda_Cole%C3%A7%C3%A3o_7.pdf

//list out unique values per year

//function that prepares land uses for use in carbon sum calculations
var prepLu = function(fc){
  var fcId = fc.get('system:id');
  var fcIdSplit = ee.String(fcId).split('/');
  var fcName = ee.String(fcIdSplit.get(-1));
  var fcGeom = ee.Feature(fc.geometry());
  return fcGeom.set('land_use',fcName);
}

//!!! update with land uses for particular deal 
var prepFarms = prepLu(farms);
//print(prepFarms);
var prepInterventions = prepLu(interventions);
//print(prepInterventions);
//var prepCounterfactuals = prepLu(counterfactuals);
//print(prepCounterfactuals);
var prepReference = prepLu(reference);
print(prepReference);
var prepFarmsUndesignated = prepLu(farmsUndesignated);
//print(prepFarmsUndesignated);

//var hist = mapbiomasLc.select('classification_2022').reduceRegion({
//  reducer: ee.Reducer.frequencyHistogram(),
//  geometry: prepCounterfactuals.geometry(),
//  scale: 5
//});
//print('hist',hist);

// 2017-2022 - farms
// 11: wetland 
// 12: grassland (present in all years but 2022)
// 15: pasture 
// 3: forest formation 
// 41: agriculate - other temporary crops
// 6: floodable forest 


// 2017-2021 - interventions
// 11: wetland 
// 12: grassland (present in all years but 2022)
// 15: pasture 
// 3: forest formation 
// 6: floodable forest 

// 2022 - interventions
// 11: wetland 
// 15: pasture 
// 3: forest formation 
// 41: agriculate - other temporary crops 

// 2017-2021 - counterfactuals
// 12: grassland
// 15: pasture 
// 3: forest formation 
// 41: agriculate - other temporary crops 

// 2017-2022 - counterfactuals
// 15: pasture 
// 3: forest formation 
// 41: agriculate - other temporary crops 

