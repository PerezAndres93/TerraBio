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


//Function to fix when there are "rings" rather than "polygons", found in some Horta files
var convertPolygon = function(geom){
  return ee.Geometry.Polygon(geom.first().geometry().coordinates());
};
// see farms for example


//=======================================
// Farm
//=======================================

var farms = ee.FeatureCollection(
      "users/ingperezescobar/TerraBio/Horta/data/2023/farms_20230601");


//* convert to polygon *//
farms = ee.FeatureCollection(convertPolygon(farms));

//print('farms', farms);

//Export to asset
Export.table.toAsset({
  collection: farms,
  description: 'farms_20230601',
  assetId: 'users/ingperezescobar/TerraBio/Horta/data/2023/farms_20230601'
});

//Export to shapefile to save to shared drive
//Export.table.toDrive({
//  collection: farms,
//  fileFormat: 'shp',
//  description: 'farms_20230601',
//});

//=======================================
// Counterfactual 
//=======================================

var counterfactuals = ee.FeatureCollection(
      "users/ingperezescobar/TerraBio/Horta/data/2023/counterfactuals_20230831");
  
//* convert to polygon *//
counterfactuals = ee.FeatureCollection(convertPolygon(counterfactuals));

//print('counterfactuals', counterfactuals);

//Export to asset
Export.table.toAsset({
  collection: counterfactuals,
  //description: 'counterfactuals_20230601',
  description: 'counterfactuals_20230831',
  //assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/counterfactuals_20230601'
  assetId: 'users/ingperezescobar/TerraBio/Horta/data/2023/counterfactuals_20230831'
});

// //export to shapefile to save to shared drive
// Export.table.toDrive({
//   collection: counterfactuals,
//   fileFormat: 'shp',
//   //description: 'counterfactuals_20230601'
//   description: 'counterfactuals_20230831'
// });



//=======================================
// Intervention
//=======================================

var interventions = ee.FeatureCollection(
      "users/ingperezescobar/TerraBio/Horta/data/2023/intervention_site2022_20230831_v4");
      
      
//* convert to polygon *//
interventions = ee.FeatureCollection(convertPolygon(interventions));
print('interventions', interventions);


//Export to asset
Export.table.toAsset({
  collection: interventions,
  //description: 'interventions_20230601',
  description: 'interventions_20230831_v4',
  //assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/intervention_site2022'
  assetId: 'users/ingperezescobar/TerraBio/Horta/data/2023/intervention_site2022_20230831_v4'
});

// //export to shapefile to save to shared drive
// Export.table.toDrive({
//   collection: interventions,
//   fileFormat: 'shp',
//   //description: 'interventions_20230601'
//   description: 'interventions_20230831'
// });


//=======================================
// Reference (forest)
//=======================================

var reference = ee.FeatureCollection(
      "users/ingperezescobar/TerraBio/Horta/data/2023/reference_20230831");

//* convert to polygon *//
reference = ee.FeatureCollection(convertPolygon(reference));

//print('reference', reference);


//Export to asset
Export.table.toAsset({
  collection: reference,
  //description: 'reference_20230601',
  description: 'reference_20230831',
  //assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/reference_20230601'
  assetId: 'users/ingperezescobar/TerraBio/Horta/data/2023/reference_20230831'
});

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

var regeneration = ee.FeatureCollection(
  'users/ingperezescobar/TerraBio/Horta/data/2023/regeneration_20230831');

//* convert to polygon *//
regeneration = ee.FeatureCollection(convertPolygon(regeneration));

//print('regeneration', regeneration);
  
//Export to asset
Export.table.toAsset({
  collection: regeneration,
  //description: 'regeneration_20230601',
  description: 'regeneration_20230831',
  //assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/regeneration_20230601'
  assetId: 'users/ingperezescobar/TerraBio/Horta/data/2023/regeneration_20230831'
});

// //export to shapefile to save to shared drive
// Export.table.toDrive({
//   collection: regeneration,
//   fileFormat: 'shp',
//   //description: 'regeneration_20230601'
//   description: 'regeneration_20230831'
// });


//=======================================
// Bounding AOI
//=======================================

// <<NOTE>> Can use the one copied from 2022 unless shapefiles change that would affect bounding box. 
var aoi = ee.FeatureCollection(
  'users/ingperezescobar/TerraBio/INOCAS/data/2024/full_aoi_20240805');


//Create an aoi that is a bounding box around farm AND counterfactual which is outside of farm
//var aoi = farms.merge(counterfactual).geometry().bounds();

 //Export to asset
 Export.table.toAsset({
   collection: ee.FeatureCollection(aoi),
   description: 'Horta_full_enclosure_aoi',
   assetId: 'users/ingperezescobar/TerraBio/Horta/data/2023/full_aoi'
 });


//=======================================
// Undesignated farm
//=======================================

//<<TO-DO>> After fixing shapefiles, run and create undesignated. 
//          Update 'geometries parameters' and data dictionary

//*  create undesignated farm  *//
//This cuts out interventions, reference, and regeneration areas out of the farm polygon

var farmsUndesignated = farms
      //note: mapping over features so can retain properties as oppsed to using .geometry 
      .map(function (f) { 
        var matrix = f
          .difference({'right': interventions.geometry(), 'maxError': 1})
          .difference({'right': regeneration.geometry(), 'maxError': 1})
          .difference({'right': reference.geometry(), 'maxError': 1});
        return matrix}); 

//* convert to polygon *//
farmsUndesignated = ee.FeatureCollection(convertPolygon(farmsUndesignated));

print('farmsUndesignated', farmsUndesignated);

 //Export to asset
Export.table.toAsset({
  collection: farmsUndesignated,
  //description: 'farms_undesignated_20230601',
  description: 'farms_undesignated_20230831',
  //assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/farms_undesignated_20230601'
  assetId: 'users/ingperezescobar/TerraBio/Horta/data/2023/farms_undesignated_20230831'
});

//========================================
// Undesignated farm - minus regeneration
//========================================

//<<TO-DO>> After fixing shapefiles, run and create undesignated. 
//          Update 'geometries parameters' and data dictionary

//*  create undesignated farm  *//
//This cuts out interventions, reference, and regeneration areas out of the farm polygon

var farmsUndesignatedNew = farms
      //note: mapping over features so can retain properties as oppsed to using .geometry 
      .map(function (f) { 
        var matrix = f
          .difference({'right': interventions.geometry(), 'maxError': 1})
          .difference({'right': reference.geometry(), 'maxError': 1})
          .difference({'right': regeneration.geometry(), 'maxError': 1});
        return matrix}); 

//* convert to polygon *//
farmsUndesignatedNew = ee.FeatureCollection(convertPolygon(farmsUndesignatedNew));

//print('farmsUndesignated', farmsUndesignated);

 //Export to asset
Export.table.toAsset({
  collection: farmsUndesignatedNew,
  //description: 'farms_undesignated_20230601',
  description: 'farms_undesignatedNew',
  //assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/farms_undesignated_20230601'
  assetId: 'users/ingperezescobar/TerraBio/Horta/data/2023/farms_undesignatedNew'
});


//=======================================
// Farm + outside land uses
//=======================================
//Generate a "farm" multipolygon that encompasses the farm and all 
//  land uses outside of the farm (like the counterfactual)

var farmsAll = farms
      //note: mapping over features so can retain properties as oppsed to using .geometry 
      .map(function (f) { 
        var matrix = f
          .union({'right': counterfactuals.geometry(), 'maxError': 1});
        return matrix}); 

//print('farmsAll',farmsAll);


//* Export to asset *//
 Export.table.toAsset({
   collection: farmsAll,
   //description: 'farms_undesignated_20230601',
   description: 'farmsAll_20230831',
   //assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/farms_undesignated_20230601'
   assetId: 'users/ingperezescobar/TerraBio/Horta/data/2023/farmsAll_20230831'
 });


//=======================================
// farmsAll minus interpreted points buffers
//=======================================
/**
var buffers = ee.FeatureCollection(
  'projects/servir-amazonia/TerraBio/Horta/data/2023/interpretedpoints_buffers_20230831');
//print('buffers',buffers);

var buffers30m = ee.FeatureCollection(
  'projects/servir-amazonia/TerraBio/Horta/data/2023/interpreted_30mbuffers_20230901');
//print('30m buffers',buffers30m);

var buffers42m = ee.FeatureCollection(
  'projects/servir-amazonia/TerraBio/Horta/data/2023/interpreted_42m_buffers');

  
var allAreasBuffers = farmsAll
      //note: mapping over features so can retain properties as oppsed to using .geometry 
      .map(function (f) { 
        var matrix = f
          .difference({'right': buffers42m.geometry(), 'maxError': 1});
        return matrix}); 
        
//print('allAreasBuffers',allAreasBuffers);
**/
//* Export to asset *//
//Export.table.toAsset({
//  collection: allAreasBuffers,
//  description: 'allAreasBuffers_42m_20230901',
//  assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/allAreasBuffers_42m_20230901'
//});

/**
//=======================================
// intervention minus interpreted points buffers
//=======================================


var interventionsBuffers = interventions
      //note: mapping over features so can retain properties as oppsed to using .geometry 
      .map(function (f) { 
        var matrix = f
          .difference({'right': buffers42m.geometry(), 'maxError': 1});
        return matrix}); 
        
print('interventionsBuffers',interventionsBuffers);
**/
//* Export to asset *//
//Export.table.toAsset({
//  collection: interventionsBuffers,
//  description: 'interventionsBuffers_42m_20230901',
//  assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/interventionsBuffers_42m_20230901'
//});

//=======================================
// reference minus interpreted points buffers
//=======================================


//var referenceBuffers = reference
//      //note: mapping over features so can retain properties as oppsed to using .geometry 
//      .map(function (f) { 
//        var matrix = f
//          .difference({'right': buffers42m.geometry(), 'maxError': 1});
//        return matrix}); 
        
//print('referenceBuffers',referenceBuffers);

//* Export to asset *//
//Export.table.toAsset({
//  collection: referenceBuffers,
//  description: 'referenceBuffers_42m_20230901',
//  assetId: 'projects/servir-amazonia/TerraBio/Horta/data/2023/referenceBuffers_42m_20230901'
//});


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
  description: 'nicfi_horta_2022_mosaic_clipped', 
  assetId: 'users/ingperezescobar/TerraBio/Horta/data/2024/nicfi_2022_mosaic_20240805', 
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
var outlineCounterfactual = empty.paint({
  featureCollection: counterfactuals,
  color: 1,
  width: 2
});
Map.addLayer(outlineCounterfactual, {palette: paletteCiat.colors.colorCounterfactual}, 'Counterfactual', false); 

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
  featureCollection: farmsAll,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarmAll, {palette: paletteCiat.colors.colorReference}, 'Farm + Counterfactual', false); 

//allAreasBuffers
//var outlineAllAreasBuffers = empty.paint({
//  featureCollection: allAreasBuffers,
//  color: 1,
//  width: 2
//});
//Map.addLayer(outlineAllAreasBuffers, {palette: 'pink'}, 'allAreasBuffers', false); 

//interventionsBuffers
//var outlineInterventionsBuffers = empty.paint({
//  featureCollection: interventionsBuffers,
//  color: 1,
//  width: 2
//});
//Map.addLayer(outlineInterventionsBuffers, {palette: 'purple'}, 'interventionsBuffers', false); 

//referenceBuffers
//var outlineReferenceBuffers = empty.paint({
//  featureCollection: referenceBuffers,
//  color: 1,
//  width: 2
//});
//Map.addLayer(outlineReferenceBuffers, {palette: 'blue'}, 'referenceBuffers', false); 


//ne wundesgianted
var outlineUndesignatedNew = empty.paint({
  featureCollection: farmsUndesignatedNew,
  color: 1,
  width: 2
});
Map.addLayer(outlineUndesignatedNew, {palette: 'blue'}, 'new undesignated', false); 

