// -------------------------------------------------------------------------------
// Pixel counter for change maps
// Authors: SIG
// Description: Pixel Counter for TerraBio, Gain and Loss change maps, 
//      Counting by strata of gain/loss change maps (respectively)
//      Also pixel counts Year of Disturbance and Disturbance/not
// Last updated & by: 2023-05-19 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-05-19: Switched to public pixel readable function, renamed other function -dnekorchuk
// 2023-05-17: Copied to Horta, started port -dnekorchuk
// -------------------------------------------------------------------------------


/* Parameters set up and module imports */

var gp = require('users/ingperezescobar/TerraBio_final:horta/2023/geometries parameters');
// Counting the pixels of change WITHIN farm boundaries (not in larger encompassing aoi)
var farms = gp.layers.farms;
var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 
var dictionaryGain = gp.params.dictionaryGain; 
var dictionaryLoss = gp.params.dictionaryLoss; 

//landtrendr
var gain = gp.layers.landtrendr.gain;
var loss = gp.layers.landtrendr.loss;
var strataGain = gain.select('remapped').unmask(0); //gain needs 0 unmasked
var strataLoss = loss.select('remapped');

//pixel counting functions
var pc = require('users/ingperezescobar/TerraBio_final:pixelCountsReadable');


/* Functions for pixel counting */

// Function to take in an LT change map and strata dictionary (gain or loss), and aoi (here, inside farm boundaries)
//    And then calculate pixel counts per strata of change map (loss: 4, gain: 2 categories)


function pixelCounting(strataImg, strataDict, aoi){
  
  // setup inputs and run pc tools
  var requestDict = {
    image: strataImg, //one or more bands
    statsBand: 'remapped', //the band name to generate stats
    // groupBy : string //optional band name to group stats by
    reducer: 'count', // the type of ststs to generate :sum, count, mean
    region: aoi, //the region of interest
    scale: 30, //the scale to calculate stats at
    // crs : string //crs code to use
  };
  var counts = pc.getStatsImage(requestDict);

  var countsReadable = pc.setReadable(counts, strataDict);

  // want export description to be specific to the img name
  var imgId = strataImg.get('system:id');
  //Split on each slash
  var imgIdSplit = ee.String(imgId).split('/');
  //The last piece is the name of the image asset
  var nameString = imgIdSplit.get(-1).getInfo();
  
  Export.table.toDrive({
    collection: countsReadable,
    description: dealName + '_' + nameString + '_pixelCounts',
    //folder:'',
    selectors: ['map_name', 'map_value', 'count', 'readable']
  });

}

// Function to take in an path to a full LT change map and aoi (here, inside farm boundaries)
//    And then calculate pixel counts per Year of Disturbance & disturbed/not disturbed

function pixelCountingYodDist(changeImg, aoi){
  
  // Select Year of Disturbance
  var imgYod = changeImg.select('yod');
  // Create second image, with binary flag for if disturbed or not
  var imgDisturbed = changeImg
        .select('yod')
        .neq(0)
        .unmask(0)
        .rename('disturbedBinary');

  // setup inputs and run pc tools
  
  // Year of Disturbance
  var requestDictYod = {
    image: imgYod, //one or more bands
    statsBand: 'yod', //the band name to generate stats
    // groupBy : string //optional band name to group stats by
    reducer: 'count', // the type of stats to generate :sum, count, mean
    region: aoi, //the region of interest
    scale: 30, //the scale to calculate stats at
    // crs : string //crs code to use
  };
  
  var countsYod = pc.getStatsImage(requestDictYod);

  // want export description to be specific to the img name
  var imgId = changeImg.get('system:id');
  //Split on each slash
  var imgIdSplit = ee.String(imgId).split('/');
  //The last piece is the name of the image asset (and make client-side)
  var nameString = imgIdSplit.get(-1).getInfo();

  Export.table.toDrive({
    collection: countsYod,
    description: dealName + '_' + nameString + '_pixelCountsYod',
    //folder:'',
    selectors: ['map_name', 'map_value', 'count', 'readable']
  });

  // Disturbance Binary
  var requestDictDist = {
    image: imgDisturbed, //one or more bands
    statsBand: 'disturbedBinary', //the band name to generate stats
    // groubBy : string //optional band name to group stats by
    reducer: 'count', // the type of ststs to generate :sum, count, mean
    region: aoi, //the region of interest
    scale: 30, //the scale to calculate stats at
    // crs : string //crs code to use
  };
  // write dictionary to add labels to disturbance counts
  var readableDistDict = ee.Dictionary({
    0: "NoDisturbance",
    1: "Disturbance"
  });

  var countsDist = pc.getStatsImage(requestDictDist);

  var countsReadableDist = pc.setReadable(countsDist, readableDistDict);

  Export.table.toDrive({
    collection: countsReadableDist,
    description: dealName + '_' + nameString + '_pixelCountsDisturbed',
    //folder:,
    selectors: ['map_name', 'map_value', 'count', 'readable']
  });

}


// /* Run pixel counting for change strata */ 

pixelCounting(strataLoss, dictionaryLoss, farms);
pixelCounting(strataGain, dictionaryGain, farms);

// /* Run pixel counting for disturbance & year */

pixelCountingYodDist(loss, farms);
pixelCountingYodDist(gain, farms);
