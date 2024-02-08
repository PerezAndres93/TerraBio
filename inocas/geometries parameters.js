// -------------------------------------------------------------------------------
// Module for base geometries and parameter exports
// Authors: dnekorchuk
// Description: Export the base geometry imports and parameters
//    so that all deal-year scripts can use the same references 
//    and easy to update for new years & deals. 
// Last updated & by: 2023-10-12 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-10-12: Added carbon factor dictionaries -vmachuca
//             Added carbon constant for pasture/grassland 
// 2023-08-31: Updated counterfactual, intervention, farmsUndesignated, reference -vmachuca
//             and regeneration layers to those generated on 2023-08-31. 
//             Added allAreasBuffers, interventionsBuffers, and referenceBuffers
// 2023-08-23: Added "hansenStartYear" and "nicfiStartYear" -vmachuca
// 2023-05-10: Added Landtrendr results 
// 2023-04-xx: Added training points, other layers
// 2023-03-20: Creation for geometries and spatial imports
// 2023-06-01: Uploaded files from the 2023 folder
// -------------------------------------------------------------------------------
 

/* Geometries */

// Base layers for boundaries of land classes 


//<<TODO>> Copy OR upload new shapefiles into Horta/data/2023 folder & update imports below (DONE)

var farms = ee.FeatureCollection(
      //"projects/servir-amazonia/TerraBio/Horta/data/2022/horta_boundary"
      "users/ingperezescobar/TerraBio/INOCAS/data/2023/farms_20240201"); //CREATED BY JORGE

var interventions = ee.FeatureCollection(
      //"projects/servir-amazonia/TerraBio/Horta/data/2022/intervention_site2022"
      "users/ingperezescobar/TerraBio/INOCAS/data/2023/interventions_20240201"); //CREATED BY JORGE

var reference = ee.FeatureCollection(
      //"projects/servir-amazonia/TerraBio/Horta/data/2022/AreaFlorestaTestemunha04"
      "users/ingperezescobar/TerraBio/INOCAS/data/2023/reference_20240201"); //CREATED BY JORGE
      
//var counterfactuals = ee.FeatureCollection(
//      //"projects/servir-amazonia/TerraBio/Horta/data/2022/cf_vizinho"
//      "projects/servir-amazonia/TerraBio/INOCAS/data/2023/counterfactuals_20240103"); //CREATED BY JORGE
      
//var regeneration = ee.FeatureCollection(
  //'projects/servir-amazonia/TerraBio/Horta/data/2022/AreaManejo03'
//  "projects/servir-amazonia/TerraBio/Horta/data/2023/regeneration_20230831"); //COMMENTED BY JORGE
    

//Derivations, made in 0. setup/0.process layers    

//<<TODO>> If the farm & counterfactual has changed, the AOI may need to be recreated
var aoi = ee.FeatureCollection(
  'users/ingperezescobar/TerraBio/INOCAS/data/2023/full_aoi_20230904'); //CREATED BY JORGE

//<<TODO>> Create
var farmsUndesignated = ee.FeatureCollection(
  'users/ingperezescobar/TerraBio/INOCAS/data/2023/farmsUndesignated_20240201'); //CREATED BY JORGE
//Map.addLayer(farmsUndesignated,{},"farmsUndesignated")
var allAreas = ee.FeatureCollection(
  'users/ingperezescobar/TerraBio/INOCAS/data/2023/allAreas_20240201'); //CREATED BY JORGE

// var allAreasBuffers = ee.FeatureCollection(
//   'projects/servir-amazonia/TerraBio/Horta/data/2023/allAreasBuffers_30m_20230901'); //COMMENTED BY JORGE
  
//var interventionsBuffers = ee.FeatureCollection(
//  'projects/servir-amazonia/TerraBio/Horta/data/2023/interventionsBuffers_30m_20230901'); //COMMENTED BY JORGE

//var referenceBuffers = ee.FeatureCollection(
//  'projects/servir-amazonia/TerraBio/Horta/data/2023/referenceBuffers_30m_20230901'); //COMMENTED BY JORGE
  
// Generated images and feature collections, to be added as they are created

//<<TODO>> Create in 0. setup/0.process layers
var nicfiEndYear = ee.Image(
  'users/ingperezescobar/TerraBio/INOCAS/data/2023/nicfi_2022_mosaic_20240103'); //CREATED BY JORGE

// Training for forest / nonforest for 2017 and 2022 NICFI, respectively
// Reusing ones created last year
var trainingForestStartYear = ee.FeatureCollection(
  'users/ingperezescobar/TerraBio/INOCAS/data/2023/ForestMasks/training_forest_2017_20230904'); //CREATED BY JORGE
  
var trainingNonforestStartYear = ee.FeatureCollection(
  'users/ingperezescobar/TerraBio/INOCAS/data/2023/ForestMasks/training_nonforest_2017_20230904'); //CREATED BY JORGE

var trainingForestEndYear = ee.FeatureCollection(
   'users/ingperezescobar/TerraBio/INOCAS/data/2023/ForestMasks/training_forest_2022_20230904'); //CREATED BY JORGE

var trainingNonforestEndYear = ee.FeatureCollection(
   'users/ingperezescobar/TerraBio/INOCAS/data/2023/ForestMasks/training_nonforest_2022_20230904'); //CREATED BY JORGE

//<<TODO>> Add after creating in 2. change/ scripts
var gain = ee.Image( 
  //'users/ingperezescobar/TerraBio/INOCAS/output/2023/lt_gain_newest_2018_2022_SAMZguidance_Neutral_v4'
  ''); //CREATED BY JORGE
  
var loss = ee.Image(
  //'users/ingperezescobar/TerraBio/INOCAS/output/2023/lt_loss_nicfiMask_newest_2018_2022_SAMZguidance_Neutral_v4'
  ''); //CREATED BY JORGE


var ceo = ee.FeatureCollection('users/ingperezescobar/TerraBio/INOCAS/data/2023/ceo-TerraBio--INOCAS-2022-sample-data-2024-01-27');
var ceo_filter_a = ee.FeatureCollection('users/ingperezescobar/TerraBio/INOCAS/data/2023/ceo_filter_a');
var ceo_filter_b = ee.FeatureCollection('users/ingperezescobar/TerraBio/INOCAS/data/2023/ceo_filter_b');
var ceo_filter_c = ee.FeatureCollection('users/ingperezescobar/TerraBio/INOCAS/data/2023/ceo_filter_c');
var ceo_filter_d = ee.FeatureCollection('users/ingperezescobar/TerraBio/INOCAS/data/2023/ceo_filter_d');


//carbon gain and loss
var carbonGain = ee.Image( 
  'users/ingperezescobar/TerraBio/INOCAS/output/2023/carbonLT_gain_newest_1985_2022_SAMZguidance_Neutral_v4'
  );
  
var carbonLoss = ee.Image(
  'users/ingperezescobar/TerraBio/INOCAS/output/2023/carbonLT_loss_comboFNFLong_newest_1985_2022_SAMZguidance_Neutral_v4'
  );


//LandTrendR stand ages
var ltStandAge = ee.Image(
  'users/ingperezescobar/TerraBio/INOCAS/output/2023/inocas2023_yearlyStandAge_1985-2022_20240127'
  );

// Export geometries
exports.layers = {
  //farm boundaries
  farms: farms,
  //intervention sites 
  interventions: interventions,
  // counterfactuals 
  //counterfactuals: counterfactuals,
  // forest reference
  reference: reference,
  //regeneration area
  //regeneration: regeneration, // COMMENTED BY JORGE
  //'undesignated' farm area (matrix)
  farmsUndesignated: farmsUndesignated,
  //farm polygon + any land use polygons outside of the farm
  allAreas: allAreas,
  //allAreas with interpreted points buffers cut out
  //allAreasBuffers: allAreasBuffers,
  //interventions with buffers cut out
  //interventionsBuffers: interventionsBuffers, // COMMENTED BY JORGE
  //reference with buffers cut out
  //referenceBuffers: referenceBuffers, // COMMENTED BY JORGE
  //an aoi that is a block around all farms
  ceo: ceo,
  ceo_filter_a: ceo_filter_a,
  ceo_filter_b: ceo_filter_b,
  ceo_filter_c: ceo_filter_c,
  ceo_filter_d: ceo_filter_d,
  aoi: aoi,
  //NICFI mosaic
  nicfiEndYear: nicfiEndYear,
  //training polygons
  trainingForestStartYear: trainingForestStartYear, 
  trainingNonforestStartYear: trainingNonforestStartYear,
  trainForestEndYear: trainingForestEndYear, 
  trainNonforestEndYear: trainingNonforestEndYear,
  landtrendr: {
     loss: loss,
     gain: gain,
     carbonGain: carbonGain,
     carbonLoss: carbonLoss,
     ltStandAge: ltStandAge
  }
};


// //Scripts will import by (example)
// var geos = require('users/dnekorchuk/terrabio:horta/2023/geometries parameters');
// var farms = geos.layers.farms;
// var interventions = geos.layers.interventions;
// var counterfactuals = geos.layers.counterfactuals;
// var reference = geos.layers.reference;
// var farmsUndesignated = geos.layers.farmsUndesignated;
// var aoi = geos.layers.aoi;
// var nicfiReportYear = geos.layers.nicfiReportYear;


/* Parameters */ 

var dealName = 'inocas'; //for descriptions, export file names, etc. // EDITED BY JORGE
var reportYear = 2023; 
var baseDataFolder = 'users/ingperezescobar/TerraBio/INOCAS/data/' + reportYear + '/'; //EDITED BY JORGE
var baseOutputFolder = 'users/ingperezescobar/TerraBio/INOCAS/output/' + reportYear + '/'; //EDITED BY JORGE

//Name of the property for the farm ID that is (or will be added in processing) in all land use layers
var idField = 'id';

var studyEndYear = reportYear - 1; //most likely, but can change
//minus 4 is a 5-year study period including end year
// Each new year (new report), subtract an additional year, 
//  so that the start year is always the initial year of the baseline report
var studyStartYear = studyEndYear - 4; 
print("studyStartYear",studyStartYear)
//start and end years for long FNF mask creation
var nicfiStartYear = 2015;
var hansenStartYear = 2000;

// Landtrendr, using its parameter names
var startYear = 1985; //year to start landtrendr, should be long period
var endYear = studyEndYear;
var startDay = '06-20';
var endDay = '09-20';
var indexChange = 'NBR';
var indexCarbon = 'NDFI';
var maskThese = ['cloud', 'shadow', 'snow', 'water'];

//Various SERVIR Global SAMZ threshold sets
// We found neutral to perform the best
// Note that the change parameter start year is defaulted to the change map range, 
//  carbon scripts will override start year. 


// Servir Global SAMZ - LowThreshold
// These are values that SERVIR uses for a low threshold
var samzLow = {
  runVersion: 'Low_v3',
  runParams: { 
    maxSegments: 6,
    spikeThreshold: 0.75,
    vertexCountOvershoot: 3,
    preventOneYearRecovery: false,
    recoveryThreshold:      1,
    pvalThreshold:          0.2,
    bestModelProportion:    0.75,
    minObservationsNeeded:  6},
  changeParamsLoss: {
    delta:  'loss', 
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:50,  operator:'>'},
    dur:    {checked:true, value:50,    operator:'<'},
    preval: {checked:true, value:300,  operator:'>'},
    mmu:    {checked:true, value:6}},
  //Params same as loss, except for delta.
  // Leaving separate in case different change params are needed
  changeParamsGain: {
    delta:  'gain', 
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:50,  operator:'>'},
    dur:    {checked:true, value:50,    operator:'<'},
    preval: {checked:true, value:300,  operator:'>'},
    mmu:    {checked:true, value:6}}
};


// Servir Global SAMZ - NeutralThreshold
// These are values that SERVIR uses for a neutral threshold
// Note: Most likely using neutral settings
var samzNeutral = {
  runVersion: 'Neutral_v4',
  runParams: { 
    maxSegments:            5,
    spikeThreshold:         0.9,
    vertexCountOvershoot:   3,
    preventOneYearRecovery: false,
    recoveryThreshold:      0.5,
    pvalThreshold:          0.1,
    bestModelProportion:    0.75,
    minObservationsNeeded:  6},
  changeParamsLoss: {
    delta:  'loss',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:100,  operator:'>'},
    dur:    {checked:false, value:50,    operator:'<'},
    preval: {checked:false, value:400,  operator:'>'},
    mmu:    {checked:false, value:6}},
  //Params same as loss, except for delta.
  // Leaving separate in case different change params are needed
  changeParamsGain: {
    delta:  'gain',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:100,  operator:'>'},
    dur:    {checked:false, value:50,    operator:'<'},
    preval: {checked:false, value:400,  operator:'>'},
    mmu:    {checked:false, value:6}},
};


// Servir Global SAMZ - NeutralThreshold
// These are values that SERVIR uses for a neutral threshold
// Note: Most likely using neutral settings
var samzNeutral_jorge = {
  runVersion: 'Neutral_v4',
  runParams: { 
    maxSegments:            5,
    spikeThreshold:         0.9,
    vertexCountOvershoot:   3,
    preventOneYearRecovery: false,
    recoveryThreshold:      0.5,
    pvalThreshold:          0.1,
    bestModelProportion:    0.75,
    minObservationsNeeded:  6},
  changeParamsLoss: {
    delta:  'loss',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:100,  operator:'>'}, // valor SIG: 100 ; valor ejemplo web: https://code.earthengine.google.com/3bf818e88952e4f84c4fac90c3ea3672 : 200
    dur:    {checked:true, value:50,    operator:'<'}, //valor SIG: 50 ; valor ejemplo web: https://code.earthengine.google.com/3bf818e88952e4f84c4fac90c3ea3672 : 4
    preval: {checked:true, value:400,  operator:'>'}, //valor SIG: 400 ; valor ejemplo web: https://code.earthengine.google.com/3bf818e88952e4f84c4fac90c3ea3672 : 300
    mmu:    {checked:true, value:6}}, 
  //Params same as loss, except for delta.
  // Leaving separate in case different change params are needed
  changeParamsGain: {
    delta:  'gain',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:100,  operator:'>'},// valor SIG: 100 ; valor ejemplo web: https://code.earthengine.google.com/f03606979139787c0c18f4efeeed76d6 : 300
    dur:    {checked:true, value:50,    operator:'<'}, // valor SIG: 50 ; valor ejemplo web: https://code.earthengine.google.com/f03606979139787c0c18f4efeeed76d6 : 4
    preval: {checked:true, value:400,  operator:'>'},// valor SIG: 400 ; valor ejemplo web: https://code.earthengine.google.com/f03606979139787c0c18f4efeeed76d6 : 300
    mmu:    {checked:true, value:6}},
};


// Servir Global SAMZ - HighThreshold
// These are values that SERVIR uses for a high threshold
var samzHigh = {
  runVersion: 'High_v3',
  runParams: { 
    maxSegments:            4,
    spikeThreshold:         1,
    vertexCountOvershoot:   3,
    preventOneYearRecovery: false,
    recoveryThreshold:      0.25,
    pvalThreshold:          0.05,
    bestModelProportion:    0.75,
    minObservationsNeeded:  6},
  changeParamsLoss: {
    delta:  'loss',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:200,  operator:'>'},
    dur:    {checked:false, value:50,    operator:'<'},
    preval: {checked:false, value:500,  operator:'>'},
    mmu:    {checked:false, value:6}},
  //Params same as loss, except for delta.
  // Leaving separate in case different change params are needed
  changeParamsGain: {
    delta:  'gain',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:200,  operator:'>'},
    dur:    {checked:false, value:50,    operator:'<'},
    preval: {checked:false, value:500,  operator:'>'},
    mmu:    {checked:false, value:6}},
};


// Servir Global SAMZ - HighThreshold
// These are values that SERVIR uses for a high threshold
var samzHigh_jorge = {
  runVersion: 'Neutral_v4',
  runParams: { 
    maxSegments:            4,
    spikeThreshold:         1,
    vertexCountOvershoot:   3,
    preventOneYearRecovery: false,
    recoveryThreshold:      0.25,
    pvalThreshold:          0.05,
    bestModelProportion:    0.75,
    minObservationsNeeded:  6},
  changeParamsLoss: {
    delta:  'loss',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:200,  operator:'>'},
    dur:    {checked:false, value:50,    operator:'<'},
    preval: {checked:false, value:500,  operator:'>'},
    mmu:    {checked:false, value:6}},
  //Params same as loss, except for delta.
  // Leaving separate in case different change params are needed
  changeParamsGain: {
    delta:  'gain',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:200,  operator:'>'},
    dur:    {checked:false, value:50,    operator:'<'},
    preval: {checked:false, value:500,  operator:'>'},
    mmu:    {checked:false, value:6}},
};


// Servir Global SAMZ - Threshold default page of landtrendr
var samz_example = {
  runVersion: 'Example_landtrendr_v1',
  runParams: { 
    maxSegments:            5,
    spikeThreshold:         0.9,
    vertexCountOvershoot:   3,
    preventOneYearRecovery: false,
    recoveryThreshold:      0.5,
    pvalThreshold:          0.1,
    bestModelProportion:    0.75,
    minObservationsNeeded:  6},
  changeParamsLoss: {
    delta:  'loss',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:200,  operator:'>'},
    dur:    {checked:true, value:4,    operator:'<'},
    preval: {checked:true, value:300,  operator:'>'},
    mmu:    {checked:true, value:11}},
  //Params same as loss, except for delta.
  // Leaving separate in case different change params are needed
  changeParamsGain: {
    delta:  'gain',
    sort:   'newest',
    year:   {checked:true, start: studyStartYear, end: studyEndYear},
    mag:    {checked:true, value:300,  operator:'>'},
    dur:    {checked:false, value:4,    operator:'<'},
    preval: {checked:false, value:300,  operator:'>'},
    mmu:    {checked:false, value:11}},
};




//dictionaries for gain and loss strata, set in 2.change/ scripts
var dictionaryGain = ee.Dictionary({
      0: "NoGain",
      1: "Gain"
    });

var dictionaryLoss = ee.Dictionary({
        1: "StableForest",
        2: "Degradation",
        3: "Deforestation",
        4: "NonForest"
    });



// carbon parameters
var carbonGrowthParams = {
    "Agroforestry Latin America and the Caribbean": {
        b0: 62.87385003,
        b1: 0.2091707646,
        b2: 4.092816633,
                
        b0_lowCI:56.63762743,
        b1_lowCI:0.2776632024,
        b2_lowCI:6.911611314,
        
        b0_highCI:70.13412236,
        b1_highCI:0.1471804252,
        b2_highCI:2.425939308,
    },
    "Nat regen south america humid": {
        b0: 110.1874441,
        b1: 0.1243730996,
        b2: 4.959449698,
        
        b0_lowCI:86.4540462,
        b1_lowCI:0.2040375212,
        b2_lowCI:18.20328004,
        
        b0_highCI:139.4995473,
        b1_highCI:0.06571520769,
        b2_highCI:1.764830577
    },
    "Planted forest broadleaf excl euc and teak (tropical humid)": {
        b0: 150.3142563,
        b1: 0.08792685514,
        b2: 2.277784605,
                
        b0_lowCI:90.05777974,
        b1_lowCI:0.184813655,
        b2_lowCI:5.759422407,
        
        b0_highCI:200,
        b1_highCI:0.07,
        b2_highCI:1.75637566
    }
}

var nfCarbonValues = ee.List([
    //non forest natural formation
    0, //wetland
    1.449, //grassland, from IPCC guidelines, https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_06_Ch6_Grassland.pdf
    0, //salt flat
    0, //rocky outcrop
    0, //herbaceous sandbank vegetation
    0, //other non forest formations
    //farming
    1.449, //pasture - IPCC applies same constant as grassland (see above)
    0, //agriculture
    0.45, //temporary crop
    0, //soybean
    0, //sugar cane
    0, //rice
    0, //cotton (beta)
    0, //other temporary crops
    0, //perennial crop 
    0, //coffee
    0, //citrus
    0, //other perennial crops
    0, //forest plantation
    0, //mosaic of uses
    //non vegetated areas
    0, //beach, dune, and sand spot
    0, //urban areas
    0, //mining
    0, //other non vegetated areas
    //water
    0, //river, lake, ocean
    0, //aquaculture
    0  //non observec
]);

var nfHigh = ee.List([   //75% error range
    //non forest natural formation
    0, //wetland
    2.53575, //grassland, from IPCC guidelines, https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_06_Ch6_Grassland.pdf
    0, //salt flat
    0, //rocky outcrop
    0, //herbaceous sandbank vegetation
    0, //other non forest formations
    //farming
    2.53575, //pasture - IPCC applies same constant as grassland (see above)
    0, //agriculture
    1.75, //temporary crop
    0, //soybean
    0, //sugar cane
    0, //rice
    0, //cotton (beta)
    0, //other temporary crops
    0, //perennial crop 
    0, //coffee
    0, //citrus
    0, //other perennial crops
    0, //forest plantation
    0, //mosaic of uses
    //non vegetated areas
    0, //beach, dune, and sand spot
    0, //urban areas
    0, //mining
    0, //other non vegetated areas
    //water
    0, //river, lake, ocean
    0, //aquaculture
    0  //non observec
]);

var nfLow = ee.List([   //75% error range
    //non forest natural formation
    0, //wetland
    0.36225, //grassland, from IPCC guidelines, https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_06_Ch6_Grassland.pdf
    0, //salt flat
    0, //rocky outcrop
    0, //herbaceous sandbank vegetation
    0, //other non forest formations
    //farming
    0.36225, //pasture - IPCC applies same constant as grassland (see above)
    0, //agriculture
    0.1125, //temporary crop
    0, //soybean
    0, //sugar cane
    0, //rice
    0, //cotton (beta)
    0, //other temporary crops
    0, //perennial crop 
    0, //coffee
    0, //citrus
    0, //other perennial crops
    0, //forest plantation
    0, //mosaic of uses
    //non vegetated areas
    0, //beach, dune, and sand spot
    0, //urban areas
    0, //mining
    0, //other non vegetated areas
    //water
    0, //river, lake, ocean
    0, //aquaculture
    0  //non observec
]);


var nfCarbonClasses = ee.List([
    //non forest natural formation
    11,//: 999, //wetland
    12,//: 6, //grassland
    32,//: 0, //salt flat
    29,//: 0, //rocky outcrop
    50,//: 0, //herbaceous sandbank vegetation
    13,//: 999, //other non forest formations
    //farming
    15,//: 6, //pasture
    18,//: 6, //agriculture
    19,//: 6, //temporary crop
    39,//: 6, //soybean
    20,//: 6, //sugar cane
    40,//: 0, //rice
    62,//: 6, //cotton (beta)
    41,//: 6, //other temporary crops
    36,//: 6, //perennial crop 
    46,//: 6, //coffee
    47,//: 6, //citrus
    48,//: 6, //other perennial crops
    9,//: 6, //forest plantation
    21,//: 6, //mosaic of uses
    //non vegetated areas
    23,//: 0, //beach, dune, and sand spot
    24,//: 0, //urban areas
    30,//: 0, //mining
    25,//: 0, //other non vegetated areas
    //water
    33,//: 0, //river, lake, ocean
    31,//: 0, //aquaculture
    27//: 0  //non observec
]);

// Export paramters
exports.params = {
  dealName: dealName,
  reportYear: reportYear, 
  baseDataFolder: baseDataFolder,
  baseOutputFolder: baseOutputFolder,
  studyStartYear: studyStartYear, 
  studyEndYear: studyEndYear, 
  startYear: startYear, 
  endYear: endYear,
  startDay: startDay,
  endDay: endDay,
  indexChange: indexChange,
  indexCarbon: indexCarbon,
  maskThese: maskThese,
  samzLow: samzLow,
  samzNeutral: samzNeutral,
  samzNeutral_jorge: samzNeutral_jorge, // added by Jorge
  samzHigh: samzHigh,
  samzHigh_jorge: samzHigh_jorge, // added by Jorge
  samz_example: samz_example, // added by Jorge
  dictionaryGain: dictionaryGain,
  dictionaryLoss: dictionaryLoss,
  nicfiStartYear: nicfiStartYear,
  hansenStartYear: hansenStartYear,
  idField: idField,
  carbonGrowthParams: carbonGrowthParams,
  nfCarbonValues: nfCarbonValues,
  nfCarbonClasses: nfCarbonClasses,
  nfLow: nfLow,
  nfHigh: nfHigh
};

  
// //Scripts will import like
// var parameters = require('users/dnekorchuk/terrabio:horta/2023/geometries parameters');
// var reportYear = parameters.params.reportYear;


