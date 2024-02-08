// -------------------------------------------------------------------------------
// Create forest/non-forest masks from NICFI
// Authors: SIG
// Description: Supervised classifier to create NICFI forest/non-forest layer
//              Creates a full year NICFI composite per year, 
//               trains classifier using imports forest & non-forest on 
//               a NICFI scene from first year of the 5-year window,
//               runs classifer on full year composites and 
//              Exports it as bands in an image (like FNF for MapBiomas).
//                Old image collection export: 'NICFI_FNF_{YEAR}_{YEAR}'. User would need to edit export settings in pop-up window
// Last updated & by: 2023-05-17 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-05-17: Copied to Horta, started port -dnekorchuk


//======================================================//
//                     Data Imports                     //
//======================================================//
// inocas
var gp = require('users/ingperezescobar/TerraBio_final:horta/2023/geometries parameters');
var aoi = gp.layers.aoi;
var nicfiEndYear = gp.layers.nicfiEndYear; //for visual comparison

//Visual interpretation of NICFI images for classification training
var forestStartYear = gp.layers.trainingForestStartYear;
var nonforestStartYear = gp.layers.trainingNonforestStartYear;

// Params
var studyStartYear = gp.params.studyStartYear;
var studyEndYear = gp.params.studyEndYear;
var startYear = gp.params.startYear; //Landtrendr start
//for use in creating 2015-2021 FNF layer
//var longStartYear = gp.params.nicfiStartYear;
var longStartYear = 2015; // EDITED BY JORGE

var baseDataFolder = gp.params.baseDataFolder; 


//MapBiomas for visual comparison afterwards
var fnfMapbiomasv7End = ee.Image(
  baseDataFolder + 'ForestMasks/mapbiomasFNF_yearly_' + studyStartYear + '-' + studyEndYear)
    .select('fnf'+studyEndYear);
   
// // No longer used, asset saved as bands of image instead 
// //Module for the batch download to assets
// var batch = require('users/fitoprincipe/geetools:batch');

//======================================================//
//                        NICFI                         //
//======================================================//

var nicfiCol = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
    //getting images for entire years (i.e. not just winter), full "col"lection
    //5-year window
    .filterDate(studyStartYear+'-01-01', (studyEndYear+1)+'-01-01');
//print('col', nicfiCol);

//To be used to create training data for classifier with digitized training polygons
var nicfiTrain = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
      //2017 is special, use 06-01 as start (6 month mosaic started then)
      .filter(ee.Filter.date('2017-06-01','2017-11-01'))
      //.filter(ee.Filter.date(studyStartYear+'-06-01',studyStartYear+'-11-01'))
      .first()
      .clip(aoi);
print('train', nicfiTrain);

//======================================================//
//                    Compositing                       //
//======================================================//

var yearList = ee.List.sequence(studyStartYear, studyEndYear);

// Map over the list of years to generate a composite for each year - returns an List.
var yearCompList = yearList.map(function(year){
  // Filter the merged collection by the given year.  
  var yearCol = nicfiCol.filter(ee.Filter.calendarRange(year, year, 'year'));
  // Make a list of filtered images for this year as a record.
  var imgList = yearCol.aggregate_array('system:index');
  // Reduce (composite) the images for this year.
  var yearComp = yearCol.reduce(ee.Reducer.median());
  // Return the intra-annual composite - set properties as defined.
  return yearComp.set({
    'year': year,
    'image_list': imgList,
    'system:index': ee.String(ee.Number(year).int()) //ends up only being name of task
  });
});
//print('yearCompList', yearCompList);

// Convert the annual composite image List to an ImageCollection
var yearCompCol = ee.ImageCollection.fromImages(yearCompList);
print('yearCompCol', yearCompCol);


//======================================================//
//      Supervised Classification for F/NF raster       //
//======================================================//
var refPts = forestStartYear.merge(nonforestStartYear);

// Make the training dataset.
var trainingSet = nicfiTrain.sampleRegions({
  collection: refPts,
  scale: 4.77,
  properties: ['class'],
  tileScale: 8
});

// Instantiate the classifier and train it.
var classifier = ee.Classifier.smileRandomForest(100).train({
  features: trainingSet,
  classProperty: 'class',
  inputProperties: ['R', 'G', 'B', 'N']
});

// Classify the input using the trained classifier.
var fnf = yearCompCol.map(function(img){
  
  return img
    .clip(aoi)
    .select(['B_median', 'G_median', 'R_median', 'N_median'],
            ['B', 'G', 'R', 'N'])
    .classify(classifier)
    .copyProperties(img, ['image_list', 'year']);

});
print('fnf', fnf);

//======================================================//
//                  Visualize the map                   //
//======================================================//
// Can comment out after confirmation and just running to save out

Map.centerObject(aoi, 12); 

var vis = {
  'bands':["R","G","B"],
  'min':64,
  'max':5454,
  'gamma':1.8
};
Map.addLayer(nicfiTrain, vis, studyStartYear+'-06 NICFI mosaic'); //2017 special, change to -07 for following years
Map.addLayer(nicfiEndYear, vis, studyEndYear+'-07 NICFI mosaic', false);

var vis_class = {
  bands:['classification'], 
  min: 0, 
  max: 1, 
  palette:['black', 'green']
};
// Display the classification.
Map.addLayer(fnf.first(), vis_class, 'FNF '+ studyStartYear + ' 5m');
Map.addLayer(fnf.first().reproject({crs:'EPSG:3857', scale:30}), 
  vis_class, 
  'FNF 2017 30m');
Map.addLayer(fnf.filterMetadata('year', 'equals', studyEndYear)
    .first()
    .reproject({crs:'EPSG:3857', scale:30}), 
  vis_class, 
  'FNF ' + studyEndYear + ' 30m', 
  false);

Map.addLayer(fnfMapbiomasv7End, 
  {min: 0, max: 1, palette: ['black', 'green']}, 
  'MapBiomas '+studyEndYear, 
  false);

//======================================================//
//                Export to asset                       //
//======================================================//
// For exporting as BANDS of single image
// Make year list client-side so can use to rename bands
var yearClient = yearList.getInfo();

var fnfNicfiYearly = fnf
    .toBands()
    //this matches the names from MapBiomas fnf
    //if you want to change, change in BOTH & in Landtrendr combo filter
    .rename(yearClient.map(function (y){return 'fnf'+y}));
print(fnfNicfiYearly); 

var outString = baseDataFolder + 'ForestMasks/nicfiFNF_yearly_' + 
                studyStartYear + '-' + studyEndYear;
print(outString);

Export.image.toAsset({
  image: fnfNicfiYearly, 
  description: 'NICFI_FNFmasks', 
  assetId: outString, 
  pyramidingPolicy: 'mode', 
  dimensions: null, 
  region: aoi, 
  scale: 5, // edited by Jorge.
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});


//======================================================//
//                2015-2021 NICFI FNF -CARBON           //
//======================================================//

///////////////**  Load data **///////////////

//NICFI 2015 imagery starts in December

var nicfiColLong = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
    //getting images for entire years (i.e. not just winter), full "col"lection
    //5-year window
    //.filterDate(longStartYear+'-12-01', (studyEndYear+1)+'-01-01');
    .filterDate(longStartYear+'-12-01', (studyEndYear+1)+'-01-01');
//print('col long', nicfiColLong);

//To be used to create training data for classifier with digitized training polygons - 1 image
var nicfiTrainLong = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
      //2015 mosaic is of December-May
      .filter(ee.Filter.date(longStartYear+'-12-01','2016-06-01')) 
      //.filter(ee.Filter.date(studyStartYear+'-07-01',studyStartYear+'-11-01'))
      .first()
      .clip(aoi);
print('train long', nicfiTrain);

/////////////**  composite  **///////////////

var yearListLong = ee.List.sequence(longStartYear, studyEndYear);

// Map over the list of years to generate a composite for each year - returns a List.
var yearCompListLong = yearListLong.map(function(year){
  // Filter the merged collection by the given year.  
  var yearCol = nicfiColLong.filter(ee.Filter.calendarRange(year, year, 'year'));
  // Make a list of filtered images for this year as a record.
  var imgList = yearCol.aggregate_array('system:index');
  // Reduce (composite) the images for this year.
  var yearComp = yearCol.reduce(ee.Reducer.median());
  // Return the intra-annual composite - set properties as defined.
  return yearComp.set({
    'year': year,
    'image_list': imgList,
    'system:index': ee.String(ee.Number(year).int()) //ends up only being name of task
  });
});
print('yearCompListLong', yearCompListLong);

// Convert the annual composite image List to an ImageCollection
var yearCompColLong = ee.ImageCollection.fromImages(yearCompListLong);
print('yearCompColLong', yearCompColLong);



/////////////**  supervised classification  **///////////////

//use same training dataset and classifier as for creation of 2017-2021 F/NF raster

// Make the training dataset.
//var trainingSetLong = nicfiTrainLong.sampleRegions({
//  collection: refPts,
//  scale: 4.77, // NICFI imagery spatial res - 4.77 m per pixel
//  properties: ['class'],
//  tileScale: 8
//});

// Instantiate the classifier and train it.
//var classifierLong = ee.Classifier.smileRandomForest(100).train({
//  features: trainingSetLong,
//  classProperty: 'class',
//  inputProperties: ['R', 'G', 'B', 'N']
//});

// Classify the input using the trained classifier.
var fnfLong = yearCompColLong.map(function(img){
  
  return img
    .clip(aoi)
    .select(['B_median', 'G_median', 'R_median', 'N_median'],
            ['B', 'G', 'R', 'N'])
    .classify(classifier)
    .copyProperties(img, ['image_list', 'year']);

});
print('fnfLong', fnfLong);


//======================================================//
//                 Visualize Long FNF                   //
//======================================================//

// Can comment out after confirmation and just running to save out

Map.centerObject(aoi, 12); 

var vis = {
  'bands':["R","G","B"],
  'min':64,
  'max':5454,
  'gamma':1.8
};
//Map.addLayer(nicfiTrainLong, vis, 'Ene 2016- May' + longStartYear + ' NICFI mosaic'); 
Map.addLayer(nicfiEndYear, vis, studyEndYear+'-07 NICFI mosaic', false);

var vis_class = {
  //bands:['classification'], 
  min: 0, 
  max: 1, 
  palette:['black', 'green']
};
// Display the classification.
Map.addLayer(fnfLong.first(), vis_class, 'FNF ' + longStartYear + ' 5m');
Map.addLayer(fnfLong.first().reproject({crs:'EPSG:3857', scale:30}), 
  vis_class, 
  'FNF ' + longStartYear + ' 30m');
Map.addLayer(fnfLong.filterMetadata('year', 'equals', studyEndYear)
    .first()
    .reproject({crs:'EPSG:3857', scale:30}), 
  vis_class, 
  'FNF ' + studyEndYear + ' 30m', 
  false);

Map.addLayer(fnfMapbiomasv7End, 
  {min: 0, max: 1, palette: ['black', 'green']}, 
  'MapBiomas '+studyEndYear, 
  false);



//======================================================//
//                    Export Long FNF                   //
//======================================================//


// For exporting as BANDS of single image
// Make year list client-side so can use to rename bands
var yearClientLong = yearListLong.getInfo();

var fnfNicfiYearlyLong = fnfLong
    .toBands()
    //this matches the names from MapBiomas fnf
    //if you want to change, change in BOTH & in Landtrendr combo filter
    .rename(yearClientLong.map(function (y){return 'fnf'+y}));
print(fnfNicfiYearlyLong); 

var outStringLong = baseDataFolder + 'ForestMasks/nicfiFNF_yearly_' + longStartYear + '-' + studyEndYear;
print(outStringLong);

Export.image.toAsset({
  image: fnfNicfiYearlyLong, 
  description: 'NICFI_FNFmasks_Long', 
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


//======================================================//
//                  CODE PARKING LOT                    //
//======================================================//

// //smoothing
// var fff = fnf.first().reproject({crs:'EPSG:3857', scale:30});
  
// //Extended Directional Smoothing
// function eds(image) {
//   // Create a list of weights for a 3x3 kernel.
//   var dir1 = ee.List([[0, 0, 0], [0.5, 0, 0.5], [0, 0, 0]]);
//   var dir2 = ee.List([[0, 0.5, 0], [0, 0, 0], [0, 0.5, 0]]);
//   var dir3 = ee.List([[0, 0, 0.5], [0, 0, 0], [0.5, 0, 0]]);
//   var dir4 = ee.List([[0.5, 0, 0], [0, 0, 0], [0, 0, 0.5]]);
//   //Convolve directional kernels with the image
//   var d1 = image.convolve(ee.Kernel.fixed(3, 3, dir1, -1, -1));
//   var d2 = image.convolve(ee.Kernel.fixed(3, 3, dir2, -1, -1));
//   var d3 = image.convolve(ee.Kernel.fixed(3, 3, dir3, -1, -1));
//   var d4 = image.convolve(ee.Kernel.fixed(3, 3, dir4, -1, -1));
//   //Absolute value of the difference from convolved image with original values
//   var D1=(d1.subtract(image)).abs();
//   var D2=(d2.subtract(image)).abs();
//   var D3=(d3.subtract(image)).abs();
//   var D4=(d4.subtract(image)).abs();
//   //Pick min pixel value based on abs difference(first input) using reducers
//   var Dd=ee.ImageCollection([[D1,d1],[D2,d2],[D3,d3],[D4,d4]]);
//   var reducer =ee.Reducer.min(2);
//   //Select the second input to the reducer
//   var v = Dd.reduce(reducer).select('min1');
//   return v;
// }



// function msd(denoised,original) {
//   var diff = denoised.subtract(original);
//   var sq= diff.pow(2);
//   var meanDict = sq.reduceRegion({
//   reducer: ee.Reducer.mean(),
//   geometry: poly,
//   scale: 20 ,
//   bestEffort:true
//   });
//   return meanDict;

// }

// //plane smoothing to remove speckle noise
// var smooth = ee.Image(fff.focal_median(100, 'circle', 'meters'));
// var image_spk = eds(smooth);
// print(image_spk);

// var vis = {
//   bands:['min1'], 
//   min: 0, 
//   max: 1, 
//   palette:['black', 'green']
// };

// Map.addLayer(image_spk, vis, 'SPK');

// // For exporting as IMAGE COLLECTION
// // Note: Use band method above unless necessary 
// // ***
// // BEFORE EXPORTING!
// //  User must go to Assets and Create New Asset under projects/servir-amazonia: 
// //   e.g. TerraBio/{CafeApui}/data/{2022}/ForestMasks/NICFI_FNF_{2017}_{2021} (sub appropriate years and deals)
// //***

// batch.Download.ImageCollection.toAsset(
//   fnf, 
//   'TerraBio/CafeApui/data/2022/ForestMasks/NICFI_FNF_' + studyStartYear + '_' + studyEndYear, 
//   {scale: 30, region: aoi, type: 'float'}
// );

// // // Fitoprincipe geetools function documentation:
// // // ImageCollection.toAsset(collection, assetFolder, options)
// // // Download every image of an ee.ImageCollection to an Asset.
// // // IMPORTANT: It can't create folders or collections in assets, so they must be created before executing this function
// // // Argument options:
// // // name: name of the ImageCollection (not the images inside)
// // // scale
// // // maxPixels
// // // region: if this argument is not defined or null it will try to use each image footprint

