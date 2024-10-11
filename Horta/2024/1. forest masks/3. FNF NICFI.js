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
var gp = require('users/ingperezescobar/TerraBio_final:horta/2024/geometries parameters');
var aoi = gp.layers.aoi;
var nicfi2022 = gp.layers.nicfi2022; //for visual comparison

//Visual interpretation of NICFI images for classification training
var forest = gp.layers.trainingForest;
var nonforest = gp.layers.trainingNonForest;

// Params
var studyStartYear = gp.params.studyStartYear;
print("studyStartYear",studyStartYear)
var studyEndYear = gp.params.studyEndYear;
print("studyEndYear",studyEndYear)
var startYear = gp.params.startYear; //Landtrendr start
print("startYear",startYear)
//for use in creating 2015-2021 FNF layer
var longStartYear = gp.params.nicfiStartYear;
print("longStartYear",longStartYear)

var baseDataFolder = gp.params.baseDataFolder; 


//MapBiomas for visual comparison afterwards
var fnfMapbiomasv7End = ee.Image(
  baseDataFolder + 'ForestMasks/mapbiomasFNF_yearly_' + studyStartYear + '-' + studyEndYear)
    .select('fnf'+studyEndYear);
   
// // No longer used, asset saved as bands of image instead 
// //Module for the batch download to assets
// var batch = require('users/fitoprincipe/geetools:batch');


//======================================================//
//                  PREPROCESS NICFI                    //
//======================================================//
function cloudScore(image) {
  
  var rescale = function (obj) {
  
      var image = obj.image.subtract(obj.min).divide(ee.Number(obj.max).subtract(obj.min));
  
      return image;
  };
  
      var cloudThresh = 10;
  
      // Compute several indicators of cloudiness and take the minimum of them.
      var score = ee.Image(1.0);
  
      // Clouds are reasonably bright in the blue band.
      score = score.min(rescale({
          'image': image.select(['B']),
          'min': 1000,
          'max': 3000
      }));
  
      // Clouds are reasonably bright in all visible bands.
      score = score.min(rescale({
          'image': image.expression("b('R') + b('G') + b('B')"),
          'min': 2000,
          'max': 8000
      }));
  
      var cond = score.lt(15);

      return image.updateMask(cond);
  }



//======================================================//
//                        NICFI                         //
//======================================================//
var vis = {'bands':['R', 'G', 'B'],'min': 64,'max': 5454,'gamma': 1.8};

var nicfiCol = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
    //getting images for entire years (i.e. not just winter), full "col"lection
    //5-year window
    .filterDate('2017-01-01', (studyEndYear+1)+'-01-01')
    //.map(cloudScore);


//To be used to create training data for classifier with digitized training polygons
var nicfiTrain = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
      //2017 is special, use 06-01 as start (6 month mosaic started then)
      .filter(ee.Filter.date('2022-06-01','2022-11-01'))
      //.filter(ee.Filter.date(studyStartYear+'-06-01',studyStartYear+'-11-01'))
      //.map(cloudScore)
      .first()
      .clip(aoi);
print('train image', nicfiTrain);
Map.addLayer(nicfiTrain,vis,"nicfiTrain")


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
//                      Smooth                          //
//======================================================//
var uniformKernel=ee.Kernel.square({
   radius: 3,
   units: 'meters',
});

function dilation(img){
  // Begin Dilation example.
  // Dilate by taking the max in each 5x5 neighborhood.
  var max=img.reduceNeighborhood({
    reducer: ee.Reducer.max(),
    kernel: uniformKernel
    });
  
  max = (max.rename('classification')).copyProperties(img, ['image_list', 'year'])
  return max
}


//======================================================//
//      Supervised Classification for F/NF raster       //
//======================================================//
var refPts = forest.merge(nonforest);

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
    .remap({
      from: [0,1,2],
      to:   [0,0,1],
    })
    .rename('classification')
    .copyProperties(img, ['image_list', 'year']);

});
print('fnf', fnf);

fnf = fnf.map(dilation)

//======================================================//
//                  Visualize the map                   //
//======================================================//
// Can comment out after confirmation and just running to save out

//Map.centerObject(aoi, 12); 

var vis = {
  'bands':["R","G","B"],
  'min':64,
  'max':5454,
  'gamma':1.8
};

var vis_class = {
  bands:['classification'], 
  min: 1, 
  max: 2, 
  palette:['black', 'green']
};


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
Map.addLayer(fnfNicfiYearly,{},"fnfNicfiYearly 4.77 m - 2023");


Export.image.toAsset({
  image: fnfNicfiYearly, 
  description: 'NICFI_FNFmasks', 
  assetId: outString, 
  //pyramidingPolicy: 'mode', 
  dimensions: null, 
  region: aoi, 
  scale: 30, // edited by Jorge.
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});