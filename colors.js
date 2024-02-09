// -------------------------------------------------------------------------------
// Colors module
// Authors: dnekorchuk
// Description: Export set of standarized colors across all deals.
//   Colors are all based on CIAT official colors
//    https://docs.google.com/presentation/d/1y62fKA3PlQRMgUcyJCM2XZxwdepmi9WB/edit#slide=id.p14
//   See also color tabs in deal's data dictionary
//      This should have details on any special colors
// Last updated & by: 2023-05-01 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-05-01: Creation, dnekorchuk

// Land uses
var colorIntervention = 'F5D226'; // yellow/gold
var colorIntervention2 = 'C4A81e'; //darker shade of gold (if needed for multiple intervention classes, etc.)
var colorCounterfactual = 'F68B33'; // orange
var colorReference = '0088C6'; //light blue
var colorRegeneration = '8EBF3F'; // light green
//NOT USED after Horta 2022: 'CAD32B'; //light yellow-green, difficult to distinguish between yellow and greens above

var colorAoi = '19191A'; //black
var colorFarm = 'FFFFFF'; //white (not technicaly CIAT, but needed something else neutral) 
var colorFarmUndesignated = 'CECFD0'; //ligher tint of CIAT light grey

var colorDeforestation = '993399'; //purple
var colorDegradation = 'DF9EDF'; //light tint of CIAT purple
var colorStableForest = '009933'; //green

var colorGain = '003580'; //CIAT blue (USAID), to stand out against green of satellite basemap, as requested

var colorBackground = '9D9FA2'; //light grey for background color

var colorDarkGrey = '414042'; //dark grey, for potential use
var colorRed = 'CC3333'; //CIAT red (USAID), for potential use

// These values are set in landtrendr scripts for TerraBio-specific strata (2. change/)
var paletteLoss = [colorStableForest, //1, stable forest
                    colorDegradation, //2, degradation
                    colorDeforestation, //3, deforestation
                    colorBackground]; //4, non-forest 
var paletteGain = [colorGain]; //1, gain
var paletteGainUnmasked = [colorBackground, //0, no gain
                           colorGain]; //1, gain


// Export
exports.colors = {
  colorIntervention: colorIntervention,
  colorIntervention2: colorIntervention2,
  colorCounterfactual: colorCounterfactual,
  colorReference: colorReference, 
  colorRegeneration: colorRegeneration, 
  colorAoi: colorAoi,
  colorFarm: colorFarm,
  colorFarmUndesignated: colorFarmUndesignated, 
  colorDeforestation: colorDeforestation,
  colorDegradation: colorDegradation, 
  colorStableForest: colorStableForest, 
  colorGain: colorGain,
  colorBackground: colorBackground,
  colorDarkGrey: colorDarkGrey,
  colorRed: colorRed,
  paletteLoss: paletteLoss,
  paletteGain: paletteGain,
  paletteGainUnmasked: paletteGainUnmasked
};

// //Scripts will import like
// var paletteCiat = require('users/dnekorchuk/terrabio:colors');
// var colorIntervention = paletteCiat.colors.colorIntervention;
