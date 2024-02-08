// -------------------------------------------------------------------------------
// Create forest/non-forest masks from NICFI
// Authors: ?, Dawn Nekorchuk
// Description: Supervised classifier to create NICFI forest/non-forest layer
//              Creates a full year NICFI composite per year, 
//               trains classifier using imports forest & non-forest on 
//               a NICFI scene from first year of the 5-year window,
//               runs classifer on full year composites and 
//              Exports it as bands in an image (like FNF for MapBiomas).
//                Old image collection export: 'NICFI_FNF_{YEAR}_{YEAR}'. User would need to edit export settings in pop-up window.
// Last updated & by: 2023-08-08 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-08-21: Fixed issue with FNF mask by adding 2000 to lossyear, exported final results -vmachuca
// 2023-08-18: generated 2000-2021 FNF mask, began troubleshooting treshold value -vmachuca
// 2023-08-11: Imported year cutoffs from geometries parameters module. -vmachuca 
// 2023-08-08: initiated -vmachuca



//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.hortaTag);

//======================================================//
//                     Data Imports                     //
//======================================================//

// Cafe Apui
var gp = require('users/ingperezescobar/TerraBio_final:horta/2023/geometries parameters');
var aoi = gp.layers.aoi;

var farms = gp.layers.farms;
var interventions = gp.layers.interventions; 
var counterfactuals = gp.layers.counterfactuals;
var reference = gp.layers.reference;
var farmsUndesignated = gp.layers.farmsUndesignated;

var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors 

// years
var startYear = gp.params.startYear; //Landtrendr start
var studyStartYear = gp.params.studyStartYear;
//print('studyStartYear',studyStartYear);
var studyEndYear = gp.params.studyEndYear;
//print('studyEndYear',studyEndYear);

var longStartYear = gp.params.hansenStartYear;

//hansen
var hansenStartYear = gp.params.hansenStartYear;
var hansenCol = ee.Image('UMD/hansen/global_forest_change_2022_v1_10');

//for export
var baseDataFolder = gp.params.baseDataFolder; 


//======================================================//
//                Hansen F/NF 2000                      //
//======================================================//

// generate FNF for the year 2000
var treeCover2000Raw = hansenCol.select('treecover2000');
var canopyForestThreshold = 80; // based on Gasparini et al. 2019 https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6891484/
var treeCover2000 = treeCover2000Raw.gte(canopyForestThreshold);
//print('treeCover2000',treeCover2000);

//select loss and gain
//   "gain": 1 where there was gain within 2000-2012, else 0
//   "lossyear": ranges from 0-22, where 0=no loss within 2000-2022, and 
//               1=loss in 2001, 2=loss in 2002, etc.
//               THUS, we add 2000 to "lossyear" so that values are actual years
var hansenLossYear = hansenCol.select('lossyear').add(2000); 
var hansenGain = hansenCol.select('gain');

//======================================================//
//              Hansen F/NF 2001-2021                   //
//======================================================//

//list of years to map over
var yearList = ee.List.sequence(hansenStartYear+1,studyEndYear).getInfo();

//Function that generates an image for each year in listYear in which
// 1.) it adds the binary 'gain' raster to treeCover200
// 2.) then subtracts the binary 'loss' rasters up to each year it is being mapped over
// 
// NOTE: Hansen only includes gain information for 2000-2012. It does not, then, account 
//       for any gain that occurred after 2012. 


function appendLossAndGain(yr){
  var currentLoss = ee.Image(0).where(hansenLossYear.lte(yr),1); //
  var fnfCurrent = treeCover2000
    .add(hansenGain)
    .subtract(currentLoss)
    .remap([2,1,-1,0],[1,1,0,0])
    .rename('fnf'+String(yr));
  return fnfCurrent; 
}

var fnfHansenList = yearList.map(appendLossAndGain);
var fnfHansen2001to2021 = ee.ImageCollection(fnfHansenList).toBands();

//print('fnfHansen',fnfHansen);


//======================================================//
//            Hansen F/NF Combo - 2000-2021             //
//======================================================//

// Generate list of band names of the form 'fnf'+ yr, where 'yr' is each year in in yearList
// ex: fnf2000, fnf 2001, etc. 
var bandNames = ee.List.sequence(hansenStartYear,studyEndYear).map(function(element){
    return ee.String('fnf').cat(ee.Number(element).toInt())  //concatanates each year in yearList to 'fnf'
  });
print('bandNames',bandNames);


//combine the 2000 fnf layer with the 2001-2021 fnf layer
//and then rename the bands using 'bandNames' defined above
var fnfHansenCombinedRaw = treeCover2000.addBands(fnfHansen2001to2021);
var fnfHansenLong = fnfHansenCombinedRaw.rename(bandNames).toUint16();
print('fnfHansenLong',fnfHansenLong);

//======================================================//
//                   Visualizations                     //
//======================================================//

// // Can comment out after confirmation and just running to save out

// Map.centerObject(interventions, 12); 

// //reference MapBiomas and NICFI
// var vis = {
//   'bands':["R","G","B"],
//   'min':64,
//   'max':5454,
//   'gamma':1.8
// };

// // nicfi 

// Map.addLayer(nicfiEndYear, vis, studyEndYear+'-07 NICFI mosaic', false);

// // MapBiomas

// Map.addLayer(fnfMapbiomasv7End, 
//   {min: 0, max: 1, palette: ['black', 'green']}, 
//   'MapBiomas '+studyEndYear, 
//   false);
 
  
// // hansen outputs


// Map.addLayer(hansenCol,{'bands':['loss']},'hansen');

// Map.addLayer(fnfHansenLong,{'bands':['fnf2001']},'hansen');

// Map.addLayer(treeCover2000,{'bands':['treecover2000']},'hansen');


// // Café Apui land uses

// //farms
// //when mapping land uses, put farms on bottom
// //    when doing undesigned comment out here and uncomment just before that one
// var empty = ee.Image().byte();
// var outlineFarms = empty.paint({
//   featureCollection: farms,
//   color: 1,
//   width: 2
// });
// Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms', false); 

// //forest reference
// var outlineForest = empty.paint({
//   featureCollection: reference,
//   color: 1,
//   width: 2
// });
// Map.addLayer(outlineForest, {palette: paletteCiat.colors.colorReference}, 'Reference Forest', false); //lt blue CIAT

// //interventions 
// var outlineIntv = empty.paint({
//   featureCollection: interventions,
//   color: 1,
//   width: 2
// });
// Map.addLayer(outlineIntv, {palette: paletteCiat.colors.colorIntervention}, 'Interventions in 2021 and Prior', false); //yellow CIAT


//======================================================//
//                        Export                        //
//======================================================//



var idStringLong = baseDataFolder + 'ForestMasks/hansenFNF_yearly_' + hansenStartYear + 
                    '-' + studyEndYear;

// Export.image.toDrive({
//   image: fnfHansenLong, 
//   description: 'hansenFNF_yearly_' + hansenStartYear + '-' + studyEndYear, 
//   folder: 'TerraBio_data', 
//   dimensions: null, 
//   region: aoi, 
//   scale: 30, 
//   crs: 'EPSG:3857', 
//   crsTransform: null, 
//   maxPixels: 1e13, 
//   shardSize: null
// });


Export.image.toAsset({
  image: fnfHansenLong, 
  description: 'hansenFNF_yearly_' + hansenStartYear + '-' + studyEndYear, 
  assetId: idStringLong, 
  pyramidingPolicy: 'mode', 
  dimensions: null, 
  region: aoi, 
  scale: 30,
  crs: 'EPSG:3857', 
  crsTransform: null, 
  maxPixels: 1e13, 
  shardSize: null
});