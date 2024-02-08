// -------------------------------------------------------------------------------
// Visualization of Land Use Areas
// Authors: SIG
// Description: Script to visualize the farm, intervention, regerenation, forest, 
//              counterfactual, (and undesignated); and print areas to console. No exports.
// Last updated & by: 2023-05-17 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-05-17: Copied to Horta, started port -dnekorchuk
// 2023-06-01: Added layers to import
//             Update year of NICFI image.
//             Commented lines with intervention featureCollections (lines 23,24,74-90,122,and 123)
//             "convertPolygon" function added.
// -------------------------------------------------------------------------------


/* Data Import */

var gp = require('users/ingperezescobar/TerraBio_final:horta/2023/geometries parameters');

var farms = gp.layers.farms;
var interventions = gp.layers.interventions; // edited by Jorge

//split interventions (Established vs New/Planned)
//var intvPre2019 = gp.layers.interventionsPre2019; // commented by Jorge
//var intv2019On = gp.layers.interventions2019On; // commented by Jorge
var counterfactuals = gp.layers.counterfactuals;
var reference = gp.layers.reference;
var farmsUndesignated = gp.layers.farmsUndesignated;
var regeneration = gp.layers.regeneration; //added by Jorge
var aoi = gp.layers.aoi;
var nicfiEndYear = gp.layers.nicfiEndYear;

var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors 


/* Visualizing the map */

Map.centerObject(farms, 11);

//NICFI background
var visNicfi = {"bands":["R","G","B"],"min":64,"max":5454,"gamma":1.8};
//Map.addLayer(nicfiEndYear, visNicfi, 'NICFI 2023'); // commented by Jorge: update year

// Display the outline of boundaries as line with no fill.
// Create an empty image into which to paint the features, cast to byte.
var empty = ee.Image().byte();
// Paint all the polygon edges with the same number and width, display.

//aoi bounding
var outlineAoi = empty.paint({
  featureCollection: aoi,
  color: 1,
  width: 2
});
//Map.addLayer(outlineAoi, {palette: paletteCiat.colors.colorAoi}, 'AOI'); 

//farms
// when mapping land uses, put farms on bottom
//    when doing undesigned comment out here and uncomment just before that one
var outlineFarms = empty.paint({
  featureCollection: farms,
  color: 1,
  width: 2
});
//Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms'); 

//forest reference
var outlineForest = empty.paint({
  featureCollection: reference,
  color: 1,
  width: 2
});
Map.addLayer(outlineForest, {palette: paletteCiat.colors.colorReference}, 'Reference Forest'); //lt blue CIAT

//intervention
var outlineIntervention = empty.paint({
  featureCollection: interventions,
  color: 1,
  width: 2
});
Map.addLayer(outlineIntervention, {palette: paletteCiat.colors.colorIntervention}, 'Intervention'); //lt blue CIAT



/*
// COMENTED BY JORGE (IT IS NO NECESSARY)
//interventions 
var outlineIntvEstbl = empty.paint({
  featureCollection: intvPre2019,
  color: 1,
  width: 2
});
Map.addLayer(outlineIntvEstbl, {palette: paletteCiat.colors.colorIntervention}, 'Established Interventions'); //yellow CIAT

var outlineIntvNew = empty.paint({
  featureCollection: intv2019On,
  color: 1,
  width: 2
});
Map.addLayer(outlineIntvNew, {palette: paletteCiat.colors.colorIntervention2}, 'Recent/Planned Interventions'); //shade of yellow
*/

//counterfactual pastures
var outlineCounter = empty.paint({
  featureCollection: counterfactuals,
  color: 1,
  width: 2
});
Map.addLayer(outlineCounter, {palette: paletteCiat.colors.colorCounterfactual}, 'Counterfactual'); //orange CIAT

var outlineRegen = empty.paint({
  featureCollection: regeneration,
  color: 1,
  width: 2
});
Map.addLayer(outlineRegen, {palette: paletteCiat.colors.colorCounterfactual}, 'Regeneration'); //orange CIAT

// //farms
// //  when wanting to display undesigned, it is better to put farms here
// var outlineFarms = empty.paint({
//   featureCollection: farms,
//   color: 1,
//   width: 2
// });
//Map.addLayer(outlineFarms, {palette: paletteCiat.colors.colorFarm}, 'Farms'); 

//Checking undesignated
//Map.addLayer(farmsUndesignated, {color: paletteCiat.colors.colorFarmUndesignated}, 'Farm Undesignated', false); //light grey CIAT


// This function was applied because in some FeatureCollection was not displaying the area (added by Jorge)
var convertPolygon = function(geom){
  return ee.Geometry.Polygon(geom.first().geometry().coordinates());
};

/* Printing statistics to Console */

print('Farm boundaries: area m2', farms.geometry().area({maxError: 1000, proj:'EPSG:3857'}));
print('Interventions - ALL: area m2', interventions.geometry().area({maxError: 1000, proj:'EPSG:3857'}));
//print('Interventions - Pre 2019: area m2', intvPre2019.geometry().area({maxError: 1000, proj:'EPSG:3857'})); // commented by Jorge
//print('Interventions - 2019+ : area m2', intv2019On.geometry().area({maxError: 1000, proj:'EPSG:3857'})); // commented by jorge
print('Reference forest: area m2', convertPolygon(reference).area({maxError: 1000, proj:'EPSG:3857'}));
print('Counterfactuals: area m2', convertPolygon(counterfactuals).area({maxError: 1000, proj:'EPSG:3857'}));
print('Farm undesignated: area m2', farmsUndesignated.geometry().area({maxError: 1000, proj:'EPSG:3857'}));
print('AOI: area m2', aoi.geometry().area({maxError: 1000, proj:'EPSG:3857'}));

//==========================================================================
// Check MapBiomas Classes within Farms
//==========================================================================

var mapbiomasLc = ee.Image(
  'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1');
//https://mapbiomas-br-site.s3.amazonaws.com/downloads/_EN__C%C3%B3digos_da_legenda_Cole%C3%A7%C3%A3o_7.pdf

//list out unique values per year

//function that prepares land uses for use in carbon sum calculations
var prepLu = function(fc){
  var fcId = fc.get('system:id');
  var fcIdSplit = ee.String(fcId).split('/');
  var fcName = ee.String(fcIdSplit.get(-1));
  var fcGeom = ee.Feature(fc.geometry());
  return fcGeom.set('land_use',fcName);
}

//!!! update with land uses for particular deal 
var prepFarms = prepLu(farms);
//print(prepFarms);
var prepInterventions = prepLu(interventions);
//print(prepInterventions);
var prepCounterfactuals = prepLu(counterfactuals);
//print(prepCounterfactuals);
var prepReference = prepLu(reference);
//print(prepReference);
var prepFarmsUndesignated = prepLu(farmsUndesignated);
//print(prepFarmsUndesignated);

var hist = mapbiomasLc.select('classification_2017').reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: prepInterventions.geometry(),
  scale: 5
});
print('hist',hist);

// 2017-2022 - farms
// 15: forest formation
// 3: pasture

// 2017-2022 - interventions
// 15: pasture
