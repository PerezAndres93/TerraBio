// -------------------------------------------------------------------------------
// Calculating stand ages from CEO results
// Authors: Elijah Dalton
//
// Last updated & by: 2023-10-06 by edalton
// -------------------------------------------------------------------------------
// Change log
// 2023-10-14: Updated some question. Control-F "!*! update" -vmachuca
// 2023-10-13: SHARED WITH JORGE -vmachuca
// 2023-10-06: Updates to stand age functions -edalton
// 2023-10-04: Updates to stand age functions -edalton
// 2023-09-20: Finalized stand age functions -edalton
// 2023-09-08: Copied from 'CEO stand age' scipt; Creation of new CEO stand age functions -edalton
// 2023-09-06: Initated, copy of "postCEO" -vmachuca
// -------------------------------------------------------------------------------
// Tags:
// !!! = places to change per deal
// !*! = under construction, questions
// -------------------------------------------------------------------------------


//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.reforesterraTag);

//======================================================//
//              Load Data and Parameters                //
//======================================================//

/* Params */
var gp = require('users/ingperezescobar/TerraBio_final:reforesterra/2023/geometries parameters');
var studyStartYear = gp.params.studyStartYear;
var studyEndYear = gp.params.studyEndYear;
var baseDataFolder = gp.params.baseDataFolder; 
var baseOutFolder = gp.params.baseOutputFolder;
var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 
var startYear = gp.params.startYear;

var dictionaryGain = gp.params.dictionaryGain; 
var dictionaryLoss = gp.params.dictionaryLoss; 


//CEO
var ceoRaw = gp.layers.ceo;  
print('ceoRaw',ceoRaw);

//landtrendr
var gain = gp.layers.landtrendr.gain;
var loss = gp.layers.landtrendr.loss;
var strataGain = gain.select('remapped').unmask(0); //gain needs 0 unmasked
var strataLoss = loss.select('remapped');

var farms = gp.layers.farms; 

//Pixel counting functions
var pc = require('users/ingperezescobar/TerraBio_final:pixelCountsReadable');


//============================================================//
//    prepare CEO response for stand age calculation          //
//============================================================//

// After CEO interpreter's review all points, 
//   plus qa/qc and admin review to resolve any discrepancies if multiple reviews on the same points, 
// 1. Download the SAMPLE "(S)" data file
// 2. Import as asset, update the 'geometries parameters' module
// Note: Some questions & answers have years in the text & will need to be updated each year/CEO project


/* Handle multiple reviewers */

//Looks to take the first entry (in it's upload order) per each sampleid
//  as long as the answers are consistent across all interpreters for a point, this will work fine
//  Wendy & her team *should* be doing an Admin Review to make sure all answers align. 
var ceo = ceoRaw.distinct('plotid'); //!*! updated
print('ceo distinct', ceo); 


//CEO fields
// Note that 'pl_' will be prepended to fields that were originally present on import. 

// 'Forest in {start year}' question: 
// IMPORTANT: The csv file will have the Yes/No answers, 
//  GEE will interpret these as "true" and "false". 


// ******************************************************************************************
// ANSWERS HAVE YEARS IN CHOICES
//  USER WILL NEED TO UPDATE ANSWERS PER YEAR/CEO PROJECT
// 
// var dictionaryLossCeo = ee.Dictionary({
//         1: 'stable forest 2017-2021',
//         2: 'Degradation of forest',
//         3: 'Deforestation',
//         4: 'non forest 2017-2021',
//         5: 'no loss - only gain' //will be further sorted in forest or non-forest later
// });

// var dictionaryGainCeo = ee.Dictionary({
//       0: 'No Forest Gain 2017-2021',
//       1: 'Forest Gain (NF to F) 2017-2021'
//     });

// var dictionaryLossCeo = ee.Dictionary({
//         1: 'stable forest 2017-2021',
//         2: 'Deforestation',
//         3: 'non forest 2017-2021',
//         4: 'no loss - only gain' //will be further sorted in forest or non-forest later
// });

// var dictionaryGainCeo = ee.Dictionary({
//       0: 'No Forest Gain 2017-2021',
//       1: 'Forest Gain (NF to F) 2017-2021'
//     });
// ******************************************************************************************


/* Get exact property names from CEO questions that have years in them */

//get list of property names (includes CEO questions)
var propNames = ceo.first().propertyNames();
print('propNames',propNames);

//Get 'Forest establishment year' question
var forestEstablishment = propNames.filter(ee.Filter.stringContains('item', 'Forest establishment year')).get(0);
print('forestEstablishment', forestEstablishment);

// Get 'forest in' question
//filter to forest in {year} question (only one, the start year)
//only one, but returns a list, so take first
var forestInQuestion = propNames.filter(ee.Filter.stringContains('item', 'Forest / canopy-covered LULC')).get(0);  //!*! updated
print('forestInQuestion', forestInQuestion);

// Get 'RECENT LOSS' question
//only one, but returns a list, so take first()
var lossQuestion = propNames.filter(ee.Filter.stringContains('item', 'Most RECENT canopy-cover LOSS')).get(0);  //!*! updated
print('lossQuestion', lossQuestion);

//Get 'Year of deforestation'
var deforestationYear = propNames.filter(ee.Filter.stringContains('item', 'Year of deforestation')).get(0);
print('deforestationYear', deforestationYear);

// Get 'RECENT GAIN' question (only one)
//only one, but returns a list, so take first()
var gainQuestion = propNames.filter(ee.Filter.stringContains('item', 'Canopy-cover GAIN')).get(0);  //!*! updated
print('gainQuestion', gainQuestion);

//Get 'Year of gain'
var gainYear = propNames.filter(ee.Filter.stringContains('item', 'Year of most recent gain')).get(0); //!*! updated
print('gainYear', gainYear);


//============================================================//
//           filter for each stand age case                   //
//============================================================//

// Years of study
var years = ee.List.sequence(startYear, studyEndYear, 1);
print('years',years);


//Feature Collections filtered for each stand age case
var stableFC = ceoRaw
      .filter(ee.Filter.neq('Forest establishment year', null))
      .filter(ee.Filter.eq(forestInQuestion, true))
      .filter(ee.Filter.neq('Most RECENT canopy-cover LOSS '+studyStartYear+'-'+studyEndYear, 'Deforestation'));
print('stableFC',stableFC);
      
var nonForestFC = ceoRaw
  .filter(ee.Filter.eq('Forest establishment year', null))
  .filter(ee.Filter.eq(forestInQuestion, false))
  .filter(ee.Filter.neq('Most RECENT canopy-cover LOSS '+studyStartYear+'-'+studyEndYear, 'stable forest '+studyStartYear+'-'+studyEndYear))
  .filter(ee.Filter.eq('Canopy-cover GAIN '+studyStartYear+'-'+studyEndYear, 'No Canopy Cover Gain '+studyStartYear+'-'+studyEndYear));
print('nonForestFC',nonForestFC);
  
var deforestedFC = ceoRaw
  .filter(ee.Filter.neq('Forest establishment year', null))
  .filter(ee.Filter.eq(forestInQuestion, true))
  .filter(ee.Filter.eq('Most RECENT canopy-cover LOSS '+studyStartYear+'-'+studyEndYear, 'Deforestation'))
  .filter(ee.Filter.neq('Canopy-cover GAIN ', 'Canopy Cover Gain (LULC change) '+studyStartYear+'-'+studyEndYear))
  .filter(ee.Filter.neq('Year of deforestation', null));
print('deforestedFC',deforestedFC);
  
var gainedFC = ceoRaw
  .filter(ee.Filter.eq(forestInQuestion, false))
  .filter(ee.Filter.eq('Canopy-cover GAIN '+studyStartYear+'-'+studyEndYear, 'Canopy Cover Gain (LULC change) '+studyStartYear+'-'+studyEndYear))
  .filter(ee.Filter.neq('Most RECENT canopy-cover LOSS '+studyStartYear+'-'+studyEndYear, 'non forest '+studyStartYear+'-'+studyEndYear))
  .filter(ee.Filter.neq('Most RECENT canopy-cover LOSS '+studyStartYear+'-'+studyEndYear, 'Deforestation'));
print('gainedFC',gainedFC);
  
var deforestGainFC = ceoRaw
  .filter(ee.Filter.neq('Forest establishment year', null))
  .filter(ee.Filter.eq(forestInQuestion, true))
  .filter(ee.Filter.eq('Most RECENT canopy-cover LOSS '+studyStartYear+'-'+studyEndYear, 'Deforestation'))
  .filter(ee.Filter.neq('Year of deforestation', null))
  .filter(ee.Filter.eq('Canopy-cover GAIN '+studyStartYear+'-'+studyEndYear, 'Canopy Cover Gain (LULC change) '+studyStartYear+'-'+studyEndYear))
  .filter(ee.Filter.neq('Year of most recent gain', null));
print('deforestGainFC',deforestGainFC);
  
var gainDeforestFC = ceoRaw
  .filter(ee.Filter.eq(forestInQuestion, false))
  .filter(ee.Filter.eq('Canopy-cover GAIN '+studyStartYear+'-'+studyEndYear, 'Canopy Cover Gain (LULC change) '+studyStartYear+'-'+studyEndYear))
  .filter(ee.Filter.eq('Most RECENT canopy-cover LOSS '+studyStartYear+'-'+studyEndYear, 'Deforestation'));
print('gainDeforestFC',gainDeforestFC);
  
//============================================================//
//            stand age: stable forest                        //
//============================================================//

// calculate stand age for stable forests and create properties for each year
var calculateStableAges = function(feature) {
  var startYear = feature.getNumber('Forest establishment year');
  var standAgeProperties = {};
  
  years.getInfo().forEach(function(year) {
    var yearProperty = 'CEO_standAge_' + year.toString();
    var diff = ee.Number(year).subtract(startYear).add(ee.Number(1));
    // var standAge = ee.Algorithms.If(startYear.eq(year), 1, ee.Algorithms.If(startYear.gt(year), 0, ee.Number(year).subtract(startYear).add(ee.Number(1))));
   var standAge = ee.Algorithms.If(
      startYear.eq(year), 1,
      ee.Algorithms.If(
        startYear.gt(year), 0,
        ee.Algorithms.If(
          startYear.lt(1985),
          ((ee.Number(year).subtract(1985)).add(37.5)),
          diff
        )
      )
    );
    standAgeProperties[yearProperty] = standAge;
  });
  
  return feature.set(standAgeProperties);
};

// Map the function over the fc
var ageStableCollection = stableFC.map(calculateStableAges);

// Print the resulting ageCollection
print(ageStableCollection, 'Stable Forest FC');

//============================================================//
//            stand age: Non-Forest                        //
//============================================================//

var calculateNFAges = function(feature) {
  var startYear = feature.getNumber('Forest establishment year');
  var standAgeProperties = {};
  
  years.getInfo().forEach(function(year) {
    var yearProperty = 'CEO_standAge_' + year.toString();
     var standAge = 0;
    standAgeProperties[yearProperty] = standAge;
  });
  
  return feature.set(standAgeProperties);
};

// Map the function over the fc
var ageNFCollection = nonForestFC.map(calculateNFAges);

// Print the resulting ageCollection
print(ageNFCollection, 'Non-Forest FC');

//============================================================//
//     stand age: forest, experienced deforestation           //
//============================================================//

// Function to calculate stand age for forested areas that experienced deforestation
var calculateDeforestedAges = function(feature) {
  var startYear = feature.getNumber('Forest establishment year');
  var yearDeforestation = feature.getNumber('Year of deforestation');
  var standAgeProperties = {};
  
  years.getInfo().forEach(function(year) {
    var yearProperty = 'CEO_standAge_' + year.toString();
      var beforeDeforestation = ee.Number(year).subtract(startYear).add(ee.Number(1));
      // var afterDeforestation = yearDeforestation.subtract(ee.Number(year));
      var afterDeforestation = ee.Number(0);
    // var standAge = ee.Algorithms.If(startYear.eq(year), 1, ee.Algorithms.If(startYear.gt(year), 0, ee.Algorithms.If(yearDeforestation.lte(year), afterDeforestation.abs(), beforeDeforestation.abs())));
    var standAge = ee.Algorithms.If(
      startYear.eq(year), 1,
      ee.Algorithms.If(
        startYear.gt(year), 0,
        ee.Algorithms.If(
          yearDeforestation.lte(year),
          afterDeforestation.abs(),
          ee.Algorithms.If(
            startYear.lt(1985),
            ((ee.Number(year).subtract(1985)).add(37.5)),
            beforeDeforestation.abs()
          )
        )
      )
    );
    
    standAgeProperties[yearProperty] = standAge;
  });
  
  return feature.set(standAgeProperties);
};

// Map the function over the fc
var ageDeforestedCollection = deforestedFC.map(calculateDeforestedAges);

// Print the resulting ageCollection
print(ageDeforestedCollection, 'Deforested FC');

//===========================================================//
//      stand age: non-forest, experienced gain              //
//===========================================================//

//Find the age of non forested areas that experienced gain (2017-2021)
var calculateGainAges = function(feature) {
  var startYear = ee.Number(0);
  var yearGain = feature.getNumber('Year of most recent gain');
  var standAgeProperties = {};
  
  years.getInfo().forEach(function(year) {
    var yearProperty = 'CEO_standAge_' + year.toString();
     var afterGain = ee.Number(year).subtract(yearGain).add(ee.Number(1));
     var standAge = ee.Algorithms.If(yearGain.gt(year), startYear, afterGain.abs());
    standAgeProperties[yearProperty] = standAge;
  });
  
  return feature.set(standAgeProperties);
};

// Map the function over the fc
var ageGainCollection = gainedFC.map(calculateGainAges);

// Print the resulting ageCollection
print(ageGainCollection, 'Non-Forest Gain FC');

//===================================================================//
//    stand age: forest, experienced deforestation then gain    //
//===================================================================//

//Find the age of Forested areas that experienced deforestation then gain (2017-2021)
var calculateDeforestGainAges = function(feature) {
  var startYear = feature.getNumber('Forest establishment year');
  var yearGain = feature.getNumber('Year of most recent gain');
  var yearDeforestation = feature.getNumber('Year of deforestation');
  var standAgeProperties = {};
  
  years.getInfo().forEach(function(year) {
    var yearProperty = 'CEO_standAge_' + year.toString();
      var beforeDeforestation = ee.Number(year).subtract(startYear).add(ee.Number(1));
      // var afterDeforestation = yearDeforestation.subtract(ee.Number(year));
      var afterDeforestation = ee.Algorithms.If(yearGain.lte(year), ee.Number(year).subtract(yearGain).add(ee.Number(1)), ee.Number(0));
      // var gain = yearDeforestation.subtract(ee.Number(year));
      // var same = ee.Algorithms.If(yearDeforestation.eq(year), 0, gain.abs());
    // var standAge = ee.Algorithms.If(startYear.eq(year), 1, ee.Algorithms.If(startYear.gt(year), 0, ee.Algorithms.If(yearDeforestation.lte(year), afterDeforestation, beforeDeforestation.abs())));
   var standAge = ee.Algorithms.If(
      startYear.eq(year), 1,
      ee.Algorithms.If(
        startYear.gt(year), 0,
        ee.Algorithms.If(
          yearDeforestation.lte(year),
          afterDeforestation,
          ee.Algorithms.If(
            startYear.lt(1985),
            ((ee.Number(year).subtract(1985)).add(37.5)),
            beforeDeforestation.abs()
          )
        )
      )
    );
    
    standAgeProperties[yearProperty] = standAge;
  });
  
  return feature.set(standAgeProperties);
};

// Map the function over the fc
var ageDGCollection = deforestGainFC.map(calculateDeforestGainAges);

// Print the resulting ageCollection
print(ageDGCollection, 'Forest deforestation then gain after FC');

//===================================================================//
//  stand age: non-forest, experienced gain then deforestation  //
//===================================================================//

//Find the age of non forested areas that experienced gain then deforestation (2017-2021)
var calculateGainDeforestAges = function(feature) {
  var startYear = ee.Number(0);
  var yearGain = feature.getNumber('Year of most recent gain');
  var yearDeforestation = feature.getNumber('Year of deforestation');
  var standAgeProperties = {};
  
  years.getInfo().forEach(function(year) {
    var yearProperty = 'CEO_standAge_' + year.toString();
      var afterGain = ee.Number(1);
      var gain = ee.Number(year).subtract(yearGain).add(afterGain);
      var after = ee.Number(year).subtract(yearDeforestation);
      var loss = ee.Algorithms.If(yearDeforestation.eq(year), startYear, gain);
      var afterDeforest = ee.Algorithms.If(yearDeforestation.lt(year), startYear, loss);
      var same = ee.Algorithms.If(yearGain.eq(year), afterGain, afterDeforest);
     var standAge = ee.Algorithms.If(yearGain.gt(year), startYear, same);
    standAgeProperties[yearProperty] = standAge;
  });
  
  return feature.set(standAgeProperties);
};

// Map the function over the fc
var ageGDCollection = gainDeforestFC.map(calculateGainDeforestAges);
print(ageGDCollection, 'Non-Forest experienced gain then deforestation');


//===================================================================//
//                            EXPORT                                 //
//===================================================================//

// Print the resulting ageCollection
// print(ageGDCollection);

var listOfFC = ee.List([
  ageStableCollection,
  ageNFCollection,
  ageDeforestedCollection,
  ageGainCollection,
  ageDGCollection,
  ageGDCollection
]);

var fc = ee.FeatureCollection(listOfFC).flatten();
print('fc',fc);
var fcFinal = fc//.distinct('plotid'); //!!!when this remains, the script only outputs one row
print(fcFinal.sort('plotid'), 'Final FC');

//Export
var fileName = dealName + '_' + reportYear + '_ceo_standAge_2023XXXX'; 
Export.table.toDrive({
  collection: fcFinal,
  description: fileName,
  fileFormat: 'CSV'
});

Export.table.toAsset({
  collection: fcFinal,
  description: fileName,
  assetId: baseOutFolder + fileName,
});
