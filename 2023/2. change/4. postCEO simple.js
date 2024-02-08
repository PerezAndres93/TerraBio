// -------------------------------------------------------------------------------
// PostCEO processing to raw confusion matrix
// Authors: Dawn Nekorchuk, Crystal Wespestad
// Description: Postprocess the CEO validation results 
//    Calculates gain/loss strata from the CEO answers,
//      marks if agreement or disagreement with map values (export per row available),
//      and creates the (unadjusted) confusion matrix (export available).
//    *** USER will need to UPDATE the question answers for THIS CEO project ***
//          See the starred section under Step 2 
//   This version does not include the complex substrata. 
//      Only the points collected using the simple sampling method for that AOI will be used for each metric,
//        not all the points within that AOI
//
//    DEV NOTE: You will need to finish calculating the 
//      strata-area-weighted confusion matrix and accuracies outside of GEE. 
//
//
//    Ref: https://www.sciencedirect.com/science/article/abs/pii/S0034425714000704
// Last updated & by: 2023-09-25 by cwespestad
// -------------------------------------------------------------------------------
// Change log
// 2023-09-25: Update for Horta CSV, with no substrata being used -cwespestad
// 2023-09-20: Updated to include substrata and export results to files -cwespestad
// 2023-06-28: Adjusted questions to Crystal-updated CEO project 
//             and added export for confusion matrices -dnekorchuk
// 2023-06-26: Deteremined it was not really possible to do the next matrix math in GEE -dnekorchuk
// 2023-06-23: Finished through the unadjusted confusion matrix and testing -dnekorchuk 
// 2023-06-12: Creation -dnekorchuk
// -------------------------------------------------------------------------------
// Tags
//
//
// -------------------------------------------------------------------------------



//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.inocasTag);

//======================================================//
//              Load Data and Parameters                //
//======================================================//

/* Params */
var gp = require('users/ingperezescobar/TerraBio_final:inocas/2023/geometries parameters')
var studyStartYear = gp.params.studyStartYear;
var studyEndYear = gp.params.studyEndYear;
var baseDataFolder = gp.params.baseDataFolder; 
var baseOutFolder = gp.params.baseOutputFolder;
var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 

var dictionaryGain = gp.params.dictionaryGain; 
var dictionaryLoss = gp.params.dictionaryLoss; 


//Pixel counting functions
var pc = require('users/ingperezescobar/TerraBio_final:pixelCountsReadable');

//======================================================//
//                 CEO Post Processing                  //
//======================================================//

// After CEO interpreter's review all points, 
//   plus qa/qc and admin review to resolve any discrepancies if multiple reviews on the same points, 
// 1. Download the SAMPLE "(S)" data file
// 2. Import as asset, update the 'geometries parameters' module
// Note: Some questions & answers have years in the text & will need to be updated each year/CEO project


/* Step 1: Handle multiple reviewers */

//###################################################
///INPUT VARIABLES of CSV FOR SAVING FILE NAMES!!!
//###################################################
var aoi = 'filter_d' //filename tag for which set of points are included, referencing aoi and any desification points that are included or not
var folder = '00_TerraBio'
var exportdate = '_01_27' //filename tag of date and or version number

//###################################################
//INPUT CORRECT CSV FILE FOR ANALYSIS!!!
//###################################################
//Looks to take the first entry (in it's upload order) per each sampleid
//  as long as the answers are consistent across all interpreters for a point, this will work fine
//  Wendy & her team *should* be doing an Admin Review to make sure all answers align. 
 

//var ceoRaw = gp.layers.ceo;
//var ceo_filter_a = gp.layers.ceo_filter_a;
//var ceo_filter_b = gp.layers.ceo_filter_b;
//var ceo_filter_c = gp.layers.ceo_filter_c;
var ceo_filter_d = gp.layers.ceo_filter_d;
var ceo = ceo_filter_d.distinct('sampleid');
//print('ceo distinct', ceo); 




/* Step 2: Assign CEO strata strategy */

//CEO fields
// Note that 'pl_' will be prepended to fields that were originally present on import. 

// 'Forest in {start year}' question: 
// IMPORTANT: The csv file will have the Yes/No answers, 
//  GEE will interpret these as "true" and "false". 

//Reminder of Landtrendr strata
// var dictionaryLoss = ee.Dictionary({
//         1: 'StableForest',
//         2: 'Degradation',
//         3: 'Deforestation',
//         4: 'NonForest'
//     });
// var dictionaryGain = ee.Dictionary({
//       0: 'NoGain',
//       1: 'Gain'
//     });

// We need to assign the loss and gain strata as derived from the CEO interpretation 
// LOSS:
//  Question: 'Most RECENT LOSS from 2017 to 2021' (e.g., years as appropriate)
//  Answer: 'Deforestation' -> assign 3
//  Answer: 'Degradation of forest' -> assign 2
//  Answer: 'stable forest 2017-2021' -> assign 1
//  Answer: 'non forest 2017-2021' -> assign 4
//  Answer: 'no loss - only gain' - this is an oddball to deal with on the loss side,
//           if first year was marked as forest, then assign 1
//           otherwise, assign 4 (yes, this means that regrowth is 4 on a loss map, but that's the strata)
// GAIN:
//  Question: 'Most RECENT GAIN from 2017 to 2021' (e.g., years as appropriate)
//  Answer: 'No Forest Gain 2017-2021' -> assign 0
//  Answer: 'Forest Gain (NF to F) 2017-2021' -> assign 1
// USER WILL NEED TO UPDATE YEARS IN QUESTION TEXT BELOW. .

// ******************************************************************************************
// ANSWERS HAVE YEARS IN CHOICES
//  USER WILL NEED TO UPDATE ANSWERS PER YEAR/CEO PROJECT
// 
var dictionaryLossCeo = ee.Dictionary({
        0: 'null',
        1: 'stable forest 2018-2022',
        2: 'Degradation of forest',
        3: 'Deforestation',
        4: 'non forest 2018-2022',
        5: 'no loss - only gain' //will be further sorted in forest or non-forest later --- CEW note, let's not do this
});

var dictionaryGainCeo = ee.Dictionary({
      0: 'No Canopy Cover Gain 2018-2022',
      1: 'Canopy Cover Gain (LULC change) 2018-2022'
    });

//substrata distionary
var dictionary_loss_then_gain = ee.Dictionary({
    10: "StableForest NoGain",
    11: "StableForest Gain",
    20: "Degradation NoGain",
    21: "Degradation Gain",
    30: "Deforestation NoGain",
    31: "Deforestation Gain",
    40: "NonForest NoGain",
    41: "NonForest Gain",
});

//substrata renumbering distionary
var dictionary_loss_then_gain_numbers = ee.Dictionary({
    0: 10,
    1: 11,
    2: 20,
    3: 21,
    4: 30,
    5: 31,
    6: 40,
    7: 41,
});


// ******************************************************************************************


/* Step 3: Get exact property names from CEO questions that have years in them */

//get list of property names (includes CEO questions)
var propNames = ceo.first().propertyNames();
print('propNames',propNames);

// Get 'forest in' question
//filter to forest in {year} question (only one, the start year)
//only one, but returns a list, so take first
//var forestInQuestion = propNames.filter(ee.Filter.stringContains('item', 'Forest in')).get(0);
//print('forestInQuestion', forestInQuestion);

// Get 'RECENT LOSS' question
//only one, but returns a list, so take first()
var lossQuestion = propNames.filter(ee.Filter.stringContains('item', 'Most RECEN')).get(0); 
print('lossQuestion', lossQuestion);

// Get 'RECENT GAIN' question (only one)
//only one, but returns a list, so take first()
var gainQuestion = propNames.filter(ee.Filter.stringContains('item', 'Canopy-cov')).get(0); 
print('gainQuestion', gainQuestion);


/* Step 4 Assign CEO strata - LOSS */

// the CEO answers will have number values according to dictionaryLossCeo (1-5)

// Map a function over that assigns key-value of value-value in question property in new property
var ceoLossFullStrata = ee.FeatureCollection(dictionaryLossCeo.keys().map(function(k){
  //feature collection of features with this key value
  var theseAnswers = ceo.filter(ee.Filter.eq(lossQuestion, dictionaryLossCeo.get(k))); 
  //map over each and set new property value (key value, which is the remapped strata value)
  var ceoStrata = theseAnswers.map(function(f){
    //turn k from string to Integer to match pl_loss_remapped
    return f.set('ceo_loss_remapped', ee.Number.parse(k)); 
  }); 
  
  return ceoStrata; 
  //flatten featurecollection of featurecollections to just a feature collection
})).flatten(); 
print('ceoLossFullStrata', ceoLossFullStrata);


//CEW note: I don't think we should alter this to have a requirement regarding the start year as forest or nonforest

/*
//translate the ceo strata 'No gain' into the loss strata
//           if marked as forest in first year, then assign 1
//           otherwise, assign 4 (yes, this means that regrowth is 4 on a LOSS map, but that's the strata)


//The 'only gain' & forest in first year items
var lossGainForest = ceoLossFullStrata
  .filter(ee.Filter.eq('ceo_loss_remapped', 5))
  .filter(ee.Filter.eq(forestInQuestion, true))
  //update strata
  .map(function(f){
    return f.set('ceo_loss_remapped', 1); 
  }); 
print('lossGainForest', lossGainForest);

//The 'only gain' & NOT forest first year items
var lossGainNon = ceoLossFullStrata
  .filter(ee.Filter.eq('ceo_loss_remapped', 5))
  .filter(ee.Filter.eq(forestInQuestion, false))
  //update strata
  .map(function(f){
    return f.set('ceo_loss_remapped', 4); 
  }); 
print('lossGainNon', lossGainNon);

// Combine back together
var ceoLossStrata = ceoLossFullStrata
  //not strata 5
  .filter(ee.Filter.eq('ceo_loss_remapped', 5).not())
  //add updated used-to-be strata 5
  .merge(lossGainForest)
  .merge(lossGainNon);

print('ceo loss strata', ceoLossStrata); 
 */ 

/* Step 5: Assign CEO strata - GAIN */
// the CEO answers will have number values according to dictionaryGainCeo (0-1)

// Map a function over that assigns key-value of value-value in question property in new property
var ceoGainStrata = ee.FeatureCollection(dictionaryGainCeo.keys().map(function(k){
  //feature collection of features with this key value
  var theseAnswers =  ceoLossFullStrata.filter(ee.Filter.eq(gainQuestion, dictionaryGainCeo.get(k)))
  //var theseAnswers = ceo.filter(ee.Filter.eq(gainQuestion, dictionaryGainCeo.get(k))); //CEW edit. replaced with above.
  //map over each and set new property value (key value, which is the remapped strata value)
  var ceoStrata = theseAnswers.map(function(f){
    //turn k from string to Integer to match pl_gain_remapped
    return f.set('ceo_gain_remapped', ee.Number.parse(k)); 
  }); 
  
  return ceoStrata; 
  //flatten featurecollection of featurecollections to just a feature collection
})).flatten(); 

print('ceo gain strata', ceoGainStrata); 

var ceoAllremaps = ceoGainStrata;

/*
// Map a function over that assigns key-value of value-value in question property in new property
var ceoSubStrata = ee.FeatureCollection(dictionary_loss_then_gain_numbers.keys().map(function(k){
  //feature collection of features with this key value
  var theseAnswers = ceoGainStrata.filter(ee.Filter.eq('loss_then_gain', dictionary_loss_then_gain_numbers.get(k))); 
  //map over each and set new property value (key value, which is the remapped strata value)
  var ceoStrata = theseAnswers.map(function(f){
    //turn k from string to Integer to match pl_loss_remapped
    return f.set('map_loss_then_gain_remapped', ee.Number.parse(k)); 
  }); 
  
  return ceoStrata; 
  //flatten featurecollection of featurecollections to just a feature collection
})).flatten(); 
print('map_loss_then_gain_remapped', ceoSubStrata);

var ceoAllremaps = ceoSubStrata;

*/


/* Step 6: Confusion Matrices */
// Comparing landtrendr strata 'pl_{loss|gain}_remapped' and 
//  ceo question classification 'ceo_{loss|gain}_remapped'


/*
//First, create binary: 0 - not matching, 1 - matches
// Note: not used in errorMatrix below, but may be helpful in general
//Loss
var lossMatched = ceoLossStrata
  //filter for when the two strata values are the same
  .filter(ee.Filter.equals({
      leftField: 'pl_loss_remapped', 
      rightField: 'ceo_loss_remapped'}))
  .map(function(f){
    //set the new property as 1, agreement
    return f.set('loss_strata_agreement', 1);
  });
var lossUnmatched = ceoLossStrata
  //filter for when the two strata values are different
  .filter(ee.Filter.equals({
      leftField: 'pl_loss_remapped', 
      rightField: 'ceo_loss_remapped'}).not())
  .map(function(f){
    //set the new property as 0, disagreement
    return f.set('loss_strata_agreement', 0);
  });

var lossCombined = lossMatched.merge(lossUnmatched); 
print('lossCombined', lossCombined);

//Gain
var gainMatched = ceoGainStrata
  //filter for when the two strata values are the same
  .filter(ee.Filter.equals({
      leftField: 'pl_gain_remapped', 
      rightField: 'ceo_gain_remapped'}))
  .map(function(f){
    //set the new property as 1, agreement
    return f.set('gain_strata_agreement', 1);
  });
      
var gainUnmatched = ceoGainStrata
  //filter for when the two strata values are different
  .filter(ee.Filter.equals({
      leftField: 'pl_gain_remapped', 
      rightField: 'ceo_gain_remapped'}).not())
  .map(function(f){
    //set the new property as 0, disagreement
    return f.set('gain_strata_agreement', 0);
  });

var gainCombined = gainMatched.merge(gainUnmatched);
print('gainCombined', gainCombined); 


// export for later review

// Export this in case you want to review later in csv file

// Note that you will have the loss & gain Landtrendr info in BOTH
//  as those properties were not filtered out. 
// Important fields are:
// 'ceo_loss_remapped' | 'ceo_gain_remapped' : strata derived from CEO answers
// 'pl_loss_remapped' | 'pl_gain_remapped' : strata from the Landtrendr-derived map
// 'loss_strata_agreement' | 'gain_strata_agreement' : binary 0/1 on if there was agreement between ceo & map

var fileNameLoss = dealName + '_' + reportYear + '_loss_map_ceo_strata_2023xxxx'; 
Export.table.toDrive({
  collection: lossCombined,
  description: fileNameLoss,
  fileFormat: 'CSV'
});

var fileNameGain = dealName + '_' + reportYear + '_gain_map_ceo_strata_2023xxxx'; 
Export.table.toDrive({
  collection: gainCombined,
  description: fileNameGain,
  fileFormat: 'CSV'
});

*/

//create confusion matrix

// DEV NOTE: with errorMatrix() -- 
// by default in GEE the ROWS are actual(CEO) and COLUMNS are predicted (map) values
// but this is not how Confusion Matices are typically seen or how all of our area estimation spreadhseets are set up
// SO WE WILL BE FLIPPING THE ACTUAL AND PREDICTED PARAMETERS SO THAT THE COLUMNS ARE CEO LABELS AND ROWS ARE THE MAP STRATA
// CEW changed Sep. 18, 2023

//CEO Loss vs Loss Map
var lossConfusionMatrix = ceoAllremaps.errorMatrix({
    actual: 'pl_loss_remapped', //updated
    predicted: 'ceo_loss_remapped',
    order: [1, 2, 3, 4, 5]
});
print('Confusion matrix for loss:', lossConfusionMatrix);

//CEO Gain vs Gain Map
var gainConfusionMatrix = ceoAllremaps.errorMatrix({
    actual: 'pl_gain_remapped', //updated
    predicted: 'ceo_gain_remapped',
    order: [0, 1]
});
print('Confusion matrix for gain:', gainConfusionMatrix);

//CEO Loss vs Gain Map
var GainMapVsCEOLossConfusionMatrix = ceoAllremaps.errorMatrix({
    actual: 'pl_gain_remapped', //updated
    predicted: 'ceo_loss_remapped',
    order: [0, 1, 2, 3, 4, 5]
});
print('Confusion matrix for ceo loss v gain map:', GainMapVsCEOLossConfusionMatrix);
/*
//CEO Loss vs Loss_Then_Gain Substrata Map
var lossConfusionMatrix_substrata = ceoAllremaps.errorMatrix({
    actual: 'map_loss_then_gain_remapped',
    predicted: 'ceo_loss_remapped',
    order: [0, 1, 2, 3, 4, 5, 6, 7]
});
print('Confusion matrix for loss via substrata:', lossConfusionMatrix_substrata);

//CEO Gain vs Loss_Then_Gain Substrata Map
var gainConfusionMatrix_substrata = ceoAllremaps.errorMatrix({
    actual: 'map_loss_then_gain_remapped',
    predicted: 'ceo_gain_remapped',
    order: [0, 1, 2, 3, 4, 5, 6, 7]
});
print('Confusion matrix for gain via substrata:', gainConfusionMatrix_substrata);
*/

// export matrices for reference

//  Using Andrea P's example: https://code.earthengine.google.com/a0c404bbd7b4ebd6c76c240722aa6c2c

//Loss
//Turn matrix into an array
var lossConfusionArray = lossConfusionMatrix.array();
//print('lossConfusionArray', lossConfusionArray); 

//Make a list of lists
var lossArrayList = lossConfusionArray.toList();
//print('lossArrayList', lossArrayList);

//Create list of column names (strata), must be strings for dictionary
//   Dev note: could probably be done programmatically, but this works
//var lossArrayColumns = ['map_1', 'map_2', 'map_3', 'map_4'];
var lossArrayColumns = ['stable forest', 'Degradation', 'Deforestation', 'non forest', 'no loss - only gain']; //CEW change


//Map over the list of lists, turn into a feature with no geometry
//  and adding properties of each column
var fcMatrixLoss = ee.FeatureCollection(lossArrayList.map(function(item) {
  var properties = ee.Dictionary.fromLists(lossArrayColumns, item);
  return ee.Feature(null, properties);
}));
print('fcMatrixLoss', fcMatrixLoss);

//Map over the feature collection & add 'ceo_{strata}' names
//Because I want the ceo label name to show in the export too 
// The features have a autogenerated id of 0 to 3
//  which are the strata 1 to 4
var fcIdRowDictionary_loss = ee.Dictionary({
  '0': 'map_1 stable forest',
  '1': 'map_2 Degradation',
  '2': 'map_3 Deforestation',
  '3': 'map_4 non-forest',
  '4': 'null' //CEW edited to map instead of CEO
});

var fcIdRowDictionary_gain = ee.Dictionary({
  '0': 'map_1 No Gain',
  '1': 'map_2 Gain', //CEW edited to map instead of CEO
});


var fcIdRowDictionary_gain_for_CEOloss = ee.Dictionary({
  '0': 'map_1 No Gain',
  '1': 'map_2 Gain',
  '2': 'null 2',
  '3': 'null 3',
  '4': 'null 4',
  '5': 'null 5',
});


var fcIdRowDictionary_substrata = ee.Dictionary({
  '0': 'map10 StableForest NoGain',
  '1': 'map11 StableForest Gain',
  '2': 'map20 Degradation NoGain',
  '3': 'map21 Degradation Gain',
  '4': 'map30 Deforestation NoGain',
  '5': 'map31 Deforestation Gain',
  '6': 'map40 NonForest NoGain',
  '7': 'map41 NonForest Gain',
});


var exportMatrixLoss = fcMatrixLoss.map(function(f){
  var thisRow = fcIdRowDictionary_loss.get(f.get('system:index'));
  return f.set('row_name', thisRow);
});
print('exportMatrixLoss', exportMatrixLoss); 


var fileNameLossMatrix = dealName + '_' + reportYear + '_' + aoi + '_loss_confusionmatrix_2023'+exportdate; 
Export.table.toDrive({
  collection: exportMatrixLoss,
  //selectors: ['row_name', 'map_1', 'map_2', 'map_3', 'map_4'],
  selectors: ['row_name','stable forest', 'Degradation', 'Deforestation', 'non forest','no loss - only gain'], //CEW edited
  description: fileNameLossMatrix,
  folder: folder,
  fileFormat: 'CSV'
});
//###################################


//Gain
//Turn matrix into an array
var gainConfusionArray = gainConfusionMatrix.array();
//print('ganConfusionArray', gainConfusionArray); 

//Make a list of lists
var gainArrayList = gainConfusionArray.toList();
//print('gainArrayList', gainArrayList);

//Create list of column names (strata), must be strings for dictionary
//   Dev note: could probably be done programmatically, but this works
// var gainArrayColumns = ['map_1', 'map_2'];
var gainArrayColumns = ['No Gain', 'Gain']; //CEW edited

//Map over the list of lists, turn into a feature with no geometry
//  and adding properties of each column
var fcMatrixGain = ee.FeatureCollection(gainArrayList.map(function(item) {
  var properties = ee.Dictionary.fromLists(gainArrayColumns, item);
  return ee.Feature(null, properties);
}));
//print('fcMatrixGain', fcMatrixGain);

//Map over the feature collection & add 'ceo_{strata}' names
//  Borrowing the dictionary from loss, in gain it is a subset: id 0, 1, strata ceo 1, 2
var exportMatrixGain = fcMatrixGain.map(function(f){
  var thisRow = fcIdRowDictionary_gain.get(f.get('system:index'));
  return f.set('row_name', thisRow);
});
print('exportMatrixGain', exportMatrixGain); 

var fileNameGainMatrix = dealName + '_' + reportYear + '_' + aoi + '_gain_confusionmatrix_2023'+exportdate; 
Export.table.toDrive({
  collection: exportMatrixGain,
  selectors: ['row_name', 'No Gain', 'Gain'],
  description: fileNameGainMatrix,
  folder: folder,
  fileFormat: 'CSV'
});
//###################################

//CEO Loss vs. Gain Map //GainMapVsCEOLossConfusionMatrix
//Turn matrix into an array
var GainMapVsCEOLossConfusionArray = GainMapVsCEOLossConfusionMatrix.array();
//print('ganConfusionArray', gainConfusionArray); 

//Make a list of lists
var GainMapVsCEOLossArrayList = GainMapVsCEOLossConfusionArray.toList();
//print('gainArrayList', gainArrayList);

//Create list of column names (strata), must be strings for dictionary
//   Dev note: could probably be done programmatically, but this works
// var gainArrayColumns = ['map_1', 'map_2'];
var lossArrayColumns = ['null','stable forest', 'Degradation', 'Deforestation', 'non forest', 'no loss - only gain']; //CEW change

//Map over the list of lists, turn into a feature with no geometry
//  and adding properties of each column
var fcMatrixGainMapVsCEOLoss = ee.FeatureCollection(GainMapVsCEOLossArrayList.map(function(item) {
  var properties = ee.Dictionary.fromLists(lossArrayColumns, item);
  return ee.Feature(null, properties);
}));
//print('fcMatrixGainMapVsCEOLoss', fcMatrixGainMapVsCEOLoss);

//Map over the feature collection & add 'ceo_{strata}' names
var exportMatrixGainMapVsCEOLoss = fcMatrixGainMapVsCEOLoss.map(function(f){
  var thisRow = fcIdRowDictionary_gain_for_CEOloss.get(f.get('system:index'));
  return f.set('row_name', thisRow);
});
print('exportMatrixGainMapVsCEOLoss', exportMatrixGainMapVsCEOLoss); 

var fileNameGainMapVsCEOLossMatrix = dealName + '_' + reportYear + '_' + aoi + '_GainMapVsCEOLoss_confusionmatrix_2023'+exportdate; 
Export.table.toDrive({
  collection: exportMatrixGainMapVsCEOLoss,
  selectors: ['row_name','stable forest', 'Degradation', 'Deforestation', 'non forest','no loss - only gain'],
  description: fileNameGainMapVsCEOLossMatrix,
  folder: folder,
  fileFormat: 'CSV'
});
//###################################

/*
//Substrata lossConfusionMatrix_substrata
//Turn matrix into an array
var SubstrataLossConfusionArray = lossConfusionMatrix_substrata.array();
//print('ganConfusionArray', gainConfusionArray); 

//Make a list of lists
var SubstrataLossArrayList = SubstrataLossConfusionArray.toList();
//print('gainArrayList', gainArrayList);

//Create list of column names (strata), must be strings for dictionary
//   Dev note: could probably be done programmatically, but this works
// var gainArrayColumns = ['map_1', 'map_2'];
var substrata_lossArrayColumns = ['null1', 'stable forest', 'Degradation', 'Deforestation', 'non forest', 'no loss - only gain','null5','null6']; //CEW edited

//Map over the list of lists, turn into a feature with no geometry
//  and adding properties of each column
var fcMatrixSubstrataLoss = ee.FeatureCollection(SubstrataLossArrayList.map(function(item) {
  var properties = ee.Dictionary.fromLists(substrata_lossArrayColumns, item);
  return ee.Feature(null, properties);
}));
print('fcMatrixGain', fcMatrixGain);

//Map over the feature collection & add 'ceo_{strata}' names
//  Borrowing the dictionary from loss, in gain it is a subset: id 0, 1, strata ceo 1, 2
var exportMatrixSubstrataLoss = fcMatrixSubstrataLoss.map(function(f){
  var thisRow = fcIdRowDictionary_substrata.get(f.get('system:index'));
  return f.set('row_name', thisRow);
});
print('export MatrixSubstrataLoss', exportMatrixSubstrataLoss); 

var fileNameSubstrataLossMatrix = dealName + '_' + reportYear + '_' + aoi + '_Substrata_Loss_confusionmatrix_2023'+exportdate; 
Export.table.toDrive({
  collection: exportMatrixSubstrataLoss,
  selectors: ['row_name','stable forest', 'Degradation', 'Deforestation', 'non forest','no loss - only gain'],
  description: fileNameSubstrataLossMatrix,
  folder: folder,
  fileFormat: 'CSV'
});
//###################################

//Substrata gainConfusionMatrix_substrata
//Turn matrix into an array
var SubstrataGainConfusionArray = gainConfusionMatrix_substrata.array();
//print('ganConfusionArray', gainConfusionArray); 

//Make a list of lists
var SubstrataGainArrayList = SubstrataGainConfusionArray.toList();
//print('gainArrayList', gainArrayList);

//Create list of column names (strata), must be strings for dictionary
//   Dev note: could probably be done programmatically, but this works
// var gainArrayColumns = ['map_1', 'map_2'];
var substrata_gainArrayColumns = ['No Gain', 'Gain','null2','null3','null4','null5','null6','null7']; //CEW edited

//Map over the list of lists, turn into a feature with no geometry
//  and adding properties of each column
var fcMatrixSubstrataGain = ee.FeatureCollection(SubstrataGainArrayList.map(function(item) {
  var properties = ee.Dictionary.fromLists(substrata_gainArrayColumns, item);
  return ee.Feature(null, properties);
}));
print('fcMatrixSubstrataGain', fcMatrixSubstrataGain);

//Map over the feature collection & add 'map_{strata}' names
var exportMatrixSubstrataGain = fcMatrixSubstrataGain.map(function(f){
  var thisRow = fcIdRowDictionary_substrata.get(f.get('system:index'));
  return f.set('row_name', thisRow);
});
print('export MatrixSubstrataGain', exportMatrixSubstrataGain); 

var fileNameSubstrataGainMatrix = dealName + '_' + reportYear + '_' + aoi + '_Substrata_Gain_confusionmatrix_2023'+exportdate; 
Export.table.toDrive({
  collection: exportMatrixSubstrataGain,
  selectors: ['row_name', 'No Gain', 'Gain'],
  description: fileNameSubstrataGainMatrix,
  folder: folder,
  fileFormat: 'CSV'
});

*/



/* Accuracies */
// For REFERENCE ONLY, the following are the NON-AREA-ADJUSTED values. 
// The actual accuracies will have the area of the different strata
//  factored into the results. 

print('Unweighted overall accuracy - loss:', lossConfusionMatrix.accuracy());
print('Unweighted overall accuracy - gain:', gainConfusionMatrix.accuracy());

//To get area-weighted accuracies, we would need to: 
//  1. Calc some totals
//  2. Get the pixel counts per strata (pixel counts to area),
//  3. Manipulate the confusion matrix as an ARRAY for the weighting,
//  4. Transform back into a confusionMatrix object for accuracies. 

// GEE does not do array / matrix math well (that isn't image-based)
//  so calculating here is not a good idea, but there exists 
//  functions/tool called AREA2 that should be usable for this. 


//======================================================//
//                      AREA2                           //
//======================================================//

// https://area2.readthedocs.io/en/latest/example_str.html







