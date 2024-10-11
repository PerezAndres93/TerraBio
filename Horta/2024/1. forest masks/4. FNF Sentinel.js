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
var studyStartYear = gp.params.studyStartYear + 2;
print("studyStartYear",studyStartYear)
var studyEndYear = gp.params.studyEndYear;
print("studyEndYear",studyEndYear)

var baseDataFolder = gp.params.baseDataFolder; 


//var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');




// ============================================================================================================================================================= //
// Fuente Sentinel-2 GEE
// ============================================================================================================================================================= //
// Harmonized Sentinel-2 Level 2A collection.
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');

// Cloud Score+ image collection. Note Cloud Score+ is produced from Sentinel-2
// Level 1C data and can be applied to either L1C or L2A collections.
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');

// Use 'cs' or 'cs_cdf', depending on your use case; see docs for guidance.
var QA_BAND = 'cs_cdf';

// The threshold for masking; values between 0.50 and 0.65 generally work well.
// Higher values will remove thin clouds, haze & cirrus shadows.
var CLEAR_THRESHOLD = 0.80;


// ------------------------------------------------------------------------------------------------------------------ //
// Función vegetation indexes
// ------------------------------------------------------------------------------------------------------------------ //
function INDEXES (image){
  
  var ndvi_function = image.expression("(B8 - B4) / (B8 + B4)", {
    B8: image.select("B8"),
    B4: image.select("B4")
  }).rename("NDVI");
  
  var gndvi_function = image.expression("(B8 - B3) / (B8 + B3)", {
    B8: image.select("B8"),
    B3: image.select("B3")
  }).rename("GNDVI");
  
  var savi_function= image.expression('(B8-B4)/ (B8 + B4 + 0.5) * (1.5)', {
    B8: image.select('B8'),
    B4: image.select('B4')
  }).rename("SAVI");

  var evi2_function = image.expression('2.5*((B8-B4)/(B8+2.4*B4+1))',{
    B8: image.select('B8'),
    B4: image.select('B4')
  }).rename("EVI2")
  
  var Cl_function = image.expression('(B7/B5)-1',{
    B7: image.select('B7'),
    B5: image.select('B5')
  }).rename("CL_RedEdge")
  
  var PSRI_function = image.expression('(B4-B2)/B6',{
    B4: image.select('B4'),
    B2: image.select('B2'),
    B6: image.select('B6')
  }).rename("PSRI")
  
  var S2REP_function = image.expression('705 + 35 * ((((B8+B4)/2)-B5)/(B6-B5))',{
    B8: image.select('B8'),
    B4: image.select('B4'),
    B5: image.select('B5'),
    B6: image.select('B6')
  }).rename("S2REP")
  
  var IRECI_function = image.expression('(B8-B4)/(B5/B6)',{
    B8: image.select('B8'),
    B4: image.select('B4'),
    B5: image.select('B5'),
    B6: image.select('B6')
  }).rename("IRECI")
  
  return image.addBands([ndvi_function, Cl_function, PSRI_function, S2REP_function, IRECI_function, gndvi_function]).copyProperties(image);
  
}


var bands = ["B2","B3","B4","B8","B11","B12","NDVI","CL_RedEdge","PSRI","S2REP","IRECI","GNDVI"]

// ------------------------------------------------------------------------------------------------------------------ //
// Make a clear median composite.
// ------------------------------------------------------------------------------------------------------------------ //
var composite = s2
    .filterBounds(aoi)
    .filterDate(studyStartYear + '-06-20', studyEndYear +'-09-20')
    .linkCollection(csPlus, [QA_BAND])
    .map(function(img) {
      return img.updateMask(img.select(QA_BAND).gte(CLEAR_THRESHOLD)).copyProperties(img);
    })
    .map(function(img){
      return (img.multiply(0.0001)).copyProperties(img, ["system:time_start", 'system:index'])
    })
    .map(INDEXES)
    .select(bands)
print("composite",composite)

//var composite2017 = composite.filter(ee.Filter.calendarRange(2017, 2017, 'year')).reduce(ee.Reducer.median())
var composite2018 = composite.filter(ee.Filter.calendarRange(2018, 2018, 'year')).reduce(ee.Reducer.median())
var composite2019 = composite.filter(ee.Filter.calendarRange(2019, 2019, 'year')).reduce(ee.Reducer.median())
var composite2020 = composite.filter(ee.Filter.calendarRange(2020, 2020, 'year')).reduce(ee.Reducer.median())
var composite2021 = composite.filter(ee.Filter.calendarRange(2021, 2021, 'year')).reduce(ee.Reducer.median())
var composite2022 = composite.filter(ee.Filter.calendarRange(2022, 2022, 'year')).reduce(ee.Reducer.median())
var composite2023 = composite.filter(ee.Filter.calendarRange(2023, 2023, 'year')).reduce(ee.Reducer.median())

//Map.addLayer(composite2017,{},"composite2017")
Map.addLayer(composite2018,{},"composite2018")
Map.addLayer(composite2019,{},"composite2019")
Map.addLayer(composite2020,{},"composite2020")
Map.addLayer(composite2021,{},"composite2021")
Map.addLayer(composite2022,{},"composite2022")
Map.addLayer(composite2023,{},"composite2023")

bands = composite2022.bandNames()

//======================================================//
//                    Compositing                       //
//======================================================//

var yearList = ee.List.sequence(studyStartYear, studyEndYear);

// Map over the list of years to generate a composite for each year - returns an List.
var yearCompList = yearList.map(function(year){
  // Filter the merged collection by the given year.  
  var yearCol = composite.filter(ee.Filter.calendarRange(year, year, 'year'));
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
var refPts = forest.merge(nonforest);

// Make the training dataset.
var trainingSet = composite2022.sampleRegions({
  collection: refPts,
  scale: 10,
  properties: ['class'],
  tileScale: 8
});

// Instantiate the classifier and train it.
var classifier = ee.Classifier.smileRandomForest(100).train({
  features: trainingSet,
  classProperty: 'class',
  inputProperties: bands
});

// Classify the input using the trained classifier.
var fnf = yearCompCol.map(function(img){
  
  return img
    .clip(aoi)
    .select(bands)
    .classify(classifier)
    .remap({
      from: [0,1,2],
      to:   [0,0,1],
    })
    .rename('classification')
    .copyProperties(img, ['image_list', 'year']);

});
print('fnf', fnf);



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
  min: 0, 
  max: 1, 
  palette:['black', 'green']
};


//======================================================//
//                Export to asset                       //
//======================================================//
// For exporting as BANDS of single image
// Make year list client-side so can use to rename bands
var yearClient = yearList.getInfo();

var fnfSentinel2Yearly = fnf
    .toBands()
    //this matches the names from MapBiomas fnf
    //if you want to change, change in BOTH & in Landtrendr combo filter
    .rename(yearClient.map(function (y){return 'fnf'+y}));
print(fnfSentinel2Yearly); 

var outString = baseDataFolder + 'ForestMasks/Sentinel2FNF_yearly_' + 
                studyStartYear + '-' + studyEndYear;
print(outString);
Map.addLayer(fnfSentinel2Yearly,{},"fnfS2Yearly 10m - 2023");




Export.image.toAsset({
  image: fnfSentinel2Yearly, 
  description: 'Sentinel_FNFmasks', 
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