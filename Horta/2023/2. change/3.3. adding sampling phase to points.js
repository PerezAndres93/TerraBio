//////////////////////////////////////////////
//// DON'T 




// -------------------------------------------------------------------------------
// Add sampling phase to all CEO sample points
// Authors: Vanessa Machuca

// Last updated & by: 2023-09-01 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-09-27: Initiated -vmachuca
// -------------------------------------------------------------------------------
// tags (use control-F to jump to tagged places)
// !!! = place to update according to deal
// -------------------------------------------------------------------------------


//===============================================================//
//                     Data Imports                              //
//===============================================================//

//Will be adding land use to sampled points
var gp = require('users/dnekorchuk/terrabio:horta/2023/geometries parameters');
var allAreas = gp.layers.allAreas;

var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 
var baseOutFolder = gp.params.baseOutputFolder;

//===============================================================//
//                     Functions                                 //
//===============================================================//

var allPoints = ee.FeatureCollection(allCeoPts);
print('all interpreted CEO points',allCeoPts); //213, sampling phase is named "pl_sampling_phase"
var originalPoints = originalCeoPts.select('sampling_phase');
print('the originals, with sampling phase',originalPoints); //185




print('extracted pts',extractedPoints);





//===============================================================//
//                          EXPORT                               //
//===============================================================//



// //"system:index" and ".geo" are not allowed in the CEO csv upload. 
// var fieldsExport = ['PLOTID', 'SAMPLEID', 'LON', 'LAT', 
//                     // main strata info
//                     'gain_remapped', 'gain_desc', 'loss_remapped', 'loss_desc', 'sampling_phase',
//                     //land use and associated farm
//                     'land_use', 'farm_id',
//                     //any other landtrendr values present (depends on result)
//                     'gain_yod', 'gain_dsnr', 'gain_dur', 'gain_mag', 'gain_preval', 'gain_rate',
//                     'loss_yod', 'loss_dsnr', 'loss_dur', 'loss_mag', 'loss_preval', 'loss_rate'];


// Export.table.toDrive({
//   collection: ptsCeo,
//   //"system:index" and ".geo" are not allowed in the CEO csv upload. 
//   selectors: fieldsExport, 
//   fileNamePrefix: dealName + '_' + reportYear + '_samplePoints_forCEO_seed' + ptSeed + '_2023xxxx', 
//   description: dealName + '_' + reportYear + '_samplePoints_forCEO_seed' + ptSeed + '_2023xxxx',  
//   fileFormat: 'CSV'
// });

