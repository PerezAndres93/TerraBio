// -------------------------------------------------------------------------------
// Pixel counter for change maps
// Authors: Kyle Woodward, Hayley Pippin, Andréa P Nicolau, Dawn Nekorchuk
// Description: Pixel Counter for TerraBio, Gain and Loss change maps, 
//      Counting by strata of gain/loss change maps (respectively)
// Last updated & by: 2023-05-10 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-05-18: Renamed YOD-disturbance counter to avoid confusion -dnekorchuk
// 2023-05-10: No hardcoded gain/loss links, using geometries parameters module
// 2023-05-02: Adapt to Cafe Apui by dnekorchuk
// 2022-11-22: update by Andréa P Nicolau
// 2022-11-21: update by Hayley Pippin 
// 2022-11-18: Created script by Kyle Woodward
// -------------------------------------------------------------------------------
// Tags
// !!! = places to change per deal
// !*! = under construction, questions
// -------------------------------------------------------------------------------


/* Parameters set up and module imports */

//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.hortaTag);


var gp = require('users/ingperezescobar/TerraBio_final:horta/2024/geometries parameters');
// Counting the pixels of change WITHIN farm boundaries (not in larger encompassing aoi)
var farms = gp.layers.farms;
var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 
var dictionaryGain = gp.params.dictionaryGain; 
var dictionaryLoss = gp.params.dictionaryLoss; 

//landtrendr
var gain = gp.layers.landtrendr.gain;
var loss = gp.layers.landtrendr.loss;
var strataGain = gain.select('remapped').unmask(0); //gain map needs 0 (no gain) unmasked
var strataLoss = loss.select('remapped');

//Note: something in these functions prints 'undefined' to Console, but all seems fine
//var pc = require('users/dsaah/SIG-EE:CEO/pixelCountReadable');
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
    reducer: 'count', // the type of stats to generate :sum, count, mean
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
    reducer: 'count', // the type of stats to generate :sum, count, mean
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


/* Run pixel counting for change strata */ 

pixelCounting(strataLoss, dictionaryLoss, farms);
pixelCounting(strataGain, dictionaryGain, farms);

/* Run pixel counting for disturbance & year */
//Note: Uncertain where this is used, but was created for Horta, so copied over -dmn

pixelCountingYodDist(loss, farms);
pixelCountingYodDist(gain, farms);
