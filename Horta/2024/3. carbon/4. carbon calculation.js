// -------------------------------------------------------------------------------
// Yearly Carbon Estimates, study start year to study end year
// Authors: Vanessa Machuca
// Credit: 
//  - John Dilger: https://earthengine.googlesource.com/users/jdilger/contract-work/+/60d1850a28b8d1073763f8fbbc37cf0bf5a063f6
//
// Description: Calculates 
// NOTE: exports results in crs EPSG:4326
// 
// Last updated & by: 2023-10-18 by vmachuca
// -------------------------------------------------------------------------------
// Change log
// 2023-12-13: Copied from Café Apui year 1 -vmachuca
// 2023-10-19: Updated CI calculation. -vmachuca
// 2023-10-18: Updated to include area adjustment. -vmachuca
// 2023-10-12: SHARED WITH JORGE -vmachuca
// 2023-10-06: Generate yearly carbon sums by land use. Apply carbon constants to NF pixels. -vmachuca
//             Added low and high CI. 
// 2023-10-03: Split undesignated farm by MapBiomas class. -vmachuca
// 2023-09-21: Updated using John's carbon calculations script, so different carbon growth curve -vmachuca
//             coefficients applied depending on land use. 
// 2023-09-15: Initiated, copied functions from "1. horta/2022/3. carbon/2. carbon calculations" -vmachuca
// -------------------------------------------------------------------------------
// Tags: 
// 
// !!! = parts to change
// !*! = under construction, questions
// -------------------------------------------------------------------------------
 
//======================================================//
//                  Parameter and Imports               //
//======================================================//

//var convertPolygon = function(geom){
//  return ee.Geometry.Polygon(geom.first().geometry().coordinates());
//};


//Workload tags -dnekorchuk
var workTags = require('users/ingperezescobar/TerraBio_final:workload tags');
ee.data.setDefaultWorkloadTag(workTags.tags.reforesterraTag);

//Geometries and parameters
var gp = require('users/ingperezescobar/TerraBio_final:reforesterra/2023/geometries parameters');
var aoi = gp.layers.aoi;
var farms = gp.layers.farms; 
var interventions = gp.layers.interventionsInFarms;
//var counterfactuals = gp.layers.counterfactualsInFarms;
var reference = gp.layers.referenceInFarms;
var farmsUndesignated = gp.layers.farmsUndesignated;
var reportYear = gp.params.reportYear;
var studyStartYear = gp.params.studyStartYear;
var studyEndYear = gp.params.studyEndYear;
//print('studyEndYear',studyEndYear);
var dealName = gp.params.dealName;

var nicfiEndYear = gp.layers.nicfiEndYear; //for visual comparison


//MapBiomas
var mapbiomasLc = ee.Image(
  'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1');
//print('mapbiomasLc bandnames', mapbiomasLc.bandNames());


//Landtrendr params
var startYear = gp.params.startYear;
var endYear = gp.params.endYear;
var startDay = gp.params.startDay;
var endDay = gp.params.endDay;
var numYears = studyEndYear - startYear;

//carbon growth parameters
var carbonParams = gp.params.carbonGrowthParams;
// print(
//   aoi.aggregate_array('carbon_id').distinct().sort(),
//   ee.Dictionary(carbonParams).keys().sort()
//   )
//print('carbonParams',carbonParams);

var nfCarbonValues = gp.params.nfCarbonValues;
var nfCarbonClasses = gp.params.nfCarbonClasses;
var nfLow = gp.params.nfLow;
var nfHigh = gp.params.nfHigh;


//Other params
var baseOutFolder = gp.params.baseOutputFolder;
var baseDataFolder = gp.params.baseDataFolder;
var dealName = gp.params.dealName;
var reportYear = gp.params.reportYear; 

var paletteCiat = require('users/ingperezescobar/TerraBio_final:colors'); // CIAT colors 
var paletteLoss = paletteCiat.colors.paletteLoss; 
var paletteGain = paletteCiat.colors.paletteGain; 
var paletteMapBiomas = paletteCiat.colors.paletteMapBiomas; 

var palettes = require('users/gena/packages:palettes'); // source: https://github.com/gee-community/ee-palettes 
var yellowToGreenPalette = palettes.crameri.bamako[50].reverse();//palettes.colorbrewer.YlGn[9];
var whiteToRedPalette = palettes.crameri.bilbao[10];

//FNF masks
var fnfCombo = ee.Image(
  baseDataFolder + 'ForestMasks/comboFNF_yearly_' + studyStartYear + '-' + studyEndYear); //2017-end year FNF layer

var fnfEnd = fnfCombo.select('fnf'+studyEndYear);

var fnfComboLong = ee.Image(
  baseDataFolder + 'ForestMasks/comboFNF_yearly_' + startYear + '-' + studyEndYear); //1985-end year FNF layer

var carbonGain = gp.layers.landtrendr.carbonGain.unmask(0);  //NDFI
var carbonLoss = gp.layers.landtrendr.carbonLoss.unmask(0);
//Map.addLayer(carbonLoss.select('yod'),{},'loss year',true);

var standAgeImage = gp.layers.landtrendr.ltStandAge.unmask(0); //stand age

//ceo points
var ceoPts = gp.layers.ceo;

//======================================================//
//             add carbon id to land uses               //
//======================================================//

// !!! assign carbon id according to deal

//the options


//HORTA
//  intervention: agroforestry
//  restoration: planted forest
//  counterfactual: pasture (according to MapBiomas)

//CAFE APUI
//  intervention: Agroforestry Latin America and the Caribbean
//  counterfactual, reference, undesignated: Nat regen south america humid

//INOCAS
//  intervention: 
//  counterfactual:

//REFORESTERRA
//  intervention: Agroforestry Latin America and the Caribbean
//  counterfactual, reference, undesignated: Nat regen south america humid

interventions = interventions.map(function(f){return f.set('carbon_id','Agroforestry Latin America and the Caribbean')});
//counterfactuals = counterfactuals.map(function(f){return f.set('carbon_id','Nat regen south america humid')});
reference = reference.map(function(f){return f.set('carbon_id','Nat regen south america humid')}); //generally stays the same, deal to deal
farmsUndesignated = farmsUndesignated.map(function(f){return f.set('carbon_id','Nat regen south america humid')});


/////////////// compile into one feature collection //////////////////

var landUses = ee.FeatureCollection([interventions,
                                     //counterfactuals,
                                     reference,
                                     farmsUndesignated
                                     ]).flatten();
// print('landUses',landUses);

// print(
//   landUses.aggregate_array('carbon_id').distinct().sort(),
//   ee.Dictionary(carbonParams).keys().sort()
//   )

//======================================================//
//      Convert stand age image to image collection     //
//======================================================//

var yearList = ee.List.sequence(studyStartYear,studyEndYear).getInfo();
//print("yearList",yearList)
var bands = standAgeImage.bandNames()
var list = bands.map(function(n) { 
    var yr = ee.Number.parse(ee.String(n).slice(-4)); //get current year from band name
    var startDate = ee.Date.fromYMD(yr,1,1).millis(); //define time_start property
    return standAgeImage.select([n]).set('system:time_start',startDate).rename('standAge');
});
var standAge = ee.ImageCollection.fromImages(list)
standAge = standAge.filter(ee.Filter.calendarRange(studyStartYear, studyEndYear, 'year'));

//print('standAge',standAge);

//======================================================//
//    Apply Carbon Growth Curves for Tree Cover Areas   //
//======================================================//


var out = standAge.map(function(f){
  var yr = f.date().get('year');
  return applyCarbonGrowthFunction(f, landUses, carbonParams).set('year',yr);
});

//print('out',out);


//======================================================//
//            Assign Values to Non-Forest Areas         //
//======================================================//

//using non-tree MapBiomas LULC class carbon constant dictionary
//based on: https://mapbiomas-br-site.s3.amazonaws.com/downloads/_EN__C%C3%B3digos_da_legenda_Cole%C3%A7%C3%A3o_7.pdf

///////////////////// translate non-forest mapbiomas classes into carbon values /////////////////// 
var nfCarbonAssignment = function(yr){
  var classes = mapbiomasLc
                .select('classification_'+yr)
                .remap(nfCarbonClasses,nfCarbonValues,0)
                .rename('class');
  return classes;
};

//do that for each year and make an image collection
var nfAssignments = ee.ImageCollection(yearList.map(nfCarbonAssignment));
//print('nfAssignments',nfAssignments);

//now calculate the variance for each NF pixel

nfAssignments = nfAssignments.map(function(img){
    var carbon = img.select('class');
    
    var carbonLow = ee.Image(0).expression("((0.75*c)/2)**2",{
    'c': carbon,
    }).rename('low');
    
    var carbonHigh = ee.Image(0).expression("((0.75*c)/2)**2",{
    'c': carbon,
    }).rename('high');
  
  return carbon.addBands(carbonLow).addBands(carbonHigh);
})

//print('modified nfAssignments',nfAssignments);

//now turn into an image with a band for each year
var nfClassImage = nfAssignments.select('class').toBands()
    .rename(yearList.map(function (y){return 'class_'+y}));
    
var nfLowImage = nfAssignments.select('low').toBands()
    .rename(yearList.map(function (y){return 'low_'+y}));
    
var nfHighImage = nfAssignments.select('high').toBands()
    .rename(yearList.map(function (y){return 'high_'+y}));
    
////////////// modify forest mask so that intervention and reference areas are given '1' values

var protectedAll = reference
      //note: mapping over features so can retain properties as oppsed to using .geometry 
      .map(function (f) { 
        var matrix = f
          .union({'right': interventions.geometry(), 'maxError': 1});
        return matrix.set('property',1)}); 

var protectedRaster = protectedAll.reduceToImage({
  properties: ['property'], //!!! this may need to change, depending on what this property is named in future deals
  reducer: ee.Reducer.anyNonZero()
}).selfMask();

var fnfBands = fnfComboLong.bandNames()
var fnfList = fnfBands.map(function(n) { 
    var img = fnfComboLong.select([n])
    var modified = img.where(protectedRaster,protectedRaster).rename('fnf');
    return modified;
});

var fnfIC = ee.ImageCollection.fromImages(fnfList)

var yearListLong = ee.List.sequence(startYear,studyEndYear).getInfo();

var fnfComboLongMod = fnfIC.select('fnf').toBands()
    .rename(yearListLong.map(function (y){return 'fnf'+y}));

/////// now assign those above values to non-forest areas in "out" //////

var nfAdjustment = function(yr){
  var currentForestMask = fnfComboLongMod.select('fnf'+yr).unmask(0);
  
  //re-assign carbon values
  var nfC = nfClassImage.select('class_'+yr); //carbon values for NF pixels
  var carbon = out.filter(ee.Filter.calendarRange(yr, yr, 'year'))
                  .first().select('carbon').rename('originalCarbon'); //original carbon values
  
  var modifiedCarbon = carbon.where(currentForestMask.eq(0),nfC).rename('carbon'); //where NF, assign NF carbon value
  
  //low
  var nfCLow = nfLowImage.select('low_'+yr); //image of lower error values built from mapbiomas image
  var lowCI = out.filter(ee.Filter.calendarRange(yr, yr, 'year'))
                  .first().select(['carbon_lowCI']).rename('originalLow'); //original lower CI values
                  
  var modifiedLow = lowCI.where(currentForestMask.eq(0),nfCLow).rename('carbon_lowCI'); //where NF, assign new error
  
  //high
  var nfCHigh = nfHighImage.select('high_'+yr); //image of higher error values built from mapbiomas image
  var highCI = out.filter(ee.Filter.calendarRange(yr, yr, 'year'))
                  .first().select(['carbon_highCI']).rename('originalHigh'); //original higher CI values
                  
  var modifiedHigh = highCI.where(currentForestMask.eq(0),nfCHigh).rename('carbon_highCI'); //where NF, assign new error
                  
  //results
  return modifiedCarbon.addBands(modifiedLow).addBands(modifiedHigh).addBands(carbon).addBands(lowCI).addBands(highCI).addBands(nfC).addBands(currentForestMask);
};

//var newOut = ee.ImageCollection(yearList.map(nfAdjustment));
var out = ee.ImageCollection(yearList.map(nfAdjustment));
print('out - after NF assignment',out);


//====================================================//
// calculate annual carbon sum by land use and export //
//====================================================//

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
//var prepCounterfactuals = prepLu(counterfactuals);
//print(prepCounterfactuals);
var prepReference = prepLu(reference);
//print(prepReference);
var prepFarmsUndesignated = prepLu(farmsUndesignated);
//print(prepFarmsUndesignated);
//var prepRegeneration = prepLu(regeneration); //!!! for Horta only
//print(prepRegeneration);

//compile features above into a feature collection
var prepLandUses = ee.FeatureCollection([prepFarms,
                                        prepInterventions,
                                        //prepCounterfactuals,
                                        prepReference,
                                        prepFarmsUndesignated
                                        ]);
//print('prepLandUses',prepLandUses);
Map.addLayer(prepReference,{},"prepReference")

/** REALIZADO PARA OBTENER MÁSCARAS
var corte_carbon = out.first().select('carbon').clip(prepFarms)
print('corte_carbon',corte_carbon)
Map.addLayer(corte_carbon,{},"corte_carbon")

Export.image.toDrive({
  image: corte_carbon,
  description: "Farms2",
  folder: '00_TerraBio',
  region: prepFarms,
  scale: '30',
  maxPixels: 10000000000000,
  fileFormat: 'TIF'})
**/

var final = prepLandUses.map(function(lu){
  var carbonSum = yearList.map(function(yr) {
    var carbon = out.filter(ee.Filter.calendarRange(yr, yr, 'year'))
                  .first().select(['carbon','carbon_lowCI','carbon_highCI']);
    
    var sum = carbon.reduceRegion({
        geometry: lu.geometry(),
        reducer: ee.Reducer.sum(),
        scale: 30,
        maxPixels: 1e9,
      });
    
    var carbonSum = ee.Number(sum.get('carbon'));
    var low = ee.Number(sum.get('carbon_lowCI')).sqrt().multiply(1.96); //lower CI  
    low = carbonSum.subtract(low);
    var high = ee.Number(sum.get('carbon_highCI')).sqrt().multiply(1.96).add(carbonSum); //higher CI
    
    var output = lu.set('carbonSum',sum.get('carbon'),
                        'carbonSum_lowCI',low,
                        'carbonSum_highCI',high,
                        'year',yr);
    return output;
  });
  return ee.FeatureCollection(carbonSum).set('land_use',lu.get('land_use'));
});

final = final.flatten();

//print('final',final);

// EXPORT ////
var fieldsExport = ['carbonSum','carbonSum_lowCI','carbonSum_highCI','year','land_use'];
var description = dealName+reportYear+'_yearlyCarbon_' + studyStartYear + '-' + studyEndYear;
Export.table.toDrive({
  collection: final,
  selectors: fieldsExport, 
  description: description + '_2023xxx',
  //folder: 'TerraBio_data'
});

//====================================================//
//   extract carbon estimates at ceo sample points    //
//====================================================//

// Export as a CSV that includes, for each year studyStartYear-studyEndYear
// - carbon estimate for each year
// - land use 

//convert image collection to image with a band for each year
var carbonImg = out.select('carbon').toBands()
    .rename(yearList.map(function (y){return 'carbon_'+y}));
print('carbon image',carbonImg);

var carbonPts = carbonImg.sampleRegions({ 
  collection: ceoPts,
  scale: 30,
  geometries: true
});

print('carbon extracted at CEO points',carbonPts);

Export.table.toDrive({
  collection: carbonPts,
  fileNamePrefix: dealName + '_' + reportYear + '_carbonPoints_2023xxxx', 
  description: dealName + '_' + reportYear + '_carbonPoints_2023xxxx',  
  fileFormat: 'CSV'
});


//=========================================//
//VISUALIZE OUTPUTS                        //
//=========================================//

Map.centerObject(aoi, 15);

//nicfi imagery
var visNicfi = {"bands":["R","G","B"],"min":64,"max":5454,"gamma":1.8};
//Map.addLayer(nicfiEndYear, visNicfi, 'NICFI 2021');

//carbon in tonnes
var carbonVis = {"opacity":1,"bands":["carbon"],"min":0,"max":111,"palette":whiteToRedPalette};

// for(var i = 2021; i < 2022; i++){
//   var carbonImg = out.filter(ee.Filter.calendarRange(i, i, 'year')).first();
//   var carbonLabel = 'carbon ' + i.toString();
//   Map.addLayer(carbonImg.select('carbon').clip(aoi), carbonVis, carbonLabel, false);
// }

// for(var i = 2021; i < 2022; i++){
//   var carbonImg = newOut.filter(ee.Filter.calendarRange(i, i, 'year')).first();
//   var carbonLabel = 'NEW carbon ' + i.toString();
//   Map.addLayer(carbonImg.select('carbon').clip(aoi), carbonVis, carbonLabel, false);
// }


//https://mapbiomas-br-site.s3.amazonaws.com/downloads/_EN__C%C3%B3digos_da_legenda_Cole%C3%A7%C3%A3o_7.pdf
//mapbiomass classification
//Map.addLayer(mapbiomasLc.select('classification_2021').clip(aoi),{'min':3,'max':49,'palette':paletteMapBiomas},'mapbiomas');


//carbon low and high CI
var carbonVisCI = {"opacity":1,"min":0,"max":130,"palette":whiteToRedPalette};

// for(var i = 2021; i < 2022; i++){
//   var carbonImg = out.filter(ee.Filter.calendarRange(i, i, 'year')).first();
//   var carbonLabelHigh = 'high CI' + i.toString();
//   var carbonLabelLow = 'low CI' + i.toString();
//   Map.addLayer(carbonImg.select('carbon_highCI').clip(aoi), carbonVisCI, carbonLabelHigh, false);
//   Map.addLayer(carbonImg.select('carbon_lowCI').clip(aoi), carbonVisCI, carbonLabelLow, false);
// }

//FNF visualization
// for(var i = 2017; i < 2023; i++){
//   var fnfLabel = 'FNF' + i.toString();
//   Map.addLayer(fnfComboLong.select('fnf'+i).clip(farms), {"min":0,"max":1}, fnfLabel, false);
// }

//farms
var empty = ee.Image().byte();
var outlineFarms = empty.paint({
  featureCollection: farms,
  color: 1,
  width: 2
});
Map.addLayer(outlineFarms, {palette: 'black'}, 'Farms',false); 

//interventions
var outlineIntv = empty.paint({
  featureCollection: interventions,
  color: 1,
  width: 2
});
//Map.addLayer(outlineIntv, {palette: paletteCiat.colors.colorIntervention}, 'Interventions',false); //yellow CIAT

//regeneration
// var outlineRegen = empty.paint({
//   featureCollection: regeneration,
//   color: 1,
//   width: 2
// });
//Map.addLayer(outlineRegen, {palette: paletteCiat.colors.colorIntervention}, 'Regeneration',false); //yellow CIAT


//undesignated farm
var empty = ee.Image().byte();
var outlineUndesignated = empty.paint({
  featureCollection: farmsUndesignated,
  color: 1,
  width: 2
});
//Map.addLayer(outlineUndesignated , {palette: 'black'}, 'Undesignated Farms',false); 

//counterfactual
//var empty = ee.Image().byte();
//var outlineCounterfactual = empty.paint({
//  featureCollection: counterfactuals,
//  color: 1,
//  width: 2
//});
//Map.addLayer(outlineCounterfactual , {palette: 'black'}, 'Counterfactuals',false); 


//reference
var empty = ee.Image().byte();
var outlineReference = empty.paint({
  featureCollection: reference,
  color: 1,
  width: 2
});
Map.addLayer(outlineReference , {palette: 'black'}, 'Reference',false); 



// ==================================//
// GENERATE AND EXPORT CARBON CHART //
// ==================================//
// generate line chart of carbon values per year

var chartStyle = {
  title: 'Total Carbon Stored',
  hAxis: {
    title: 'Years'
  },
  vAxis: {
    title: 'Amount of Stored Carbon (t C)'
  },
  series: {
    0: {lineWidth: 2}
  }
};


// !!! change which land use you want to visualize
var luCarbonSum = final.filter(ee.Filter.stringContains('land_use','farms_20230414'));
print('luCarbonSum',luCarbonSum);

var carbonChartLU = ui.Chart.feature.byFeature(luCarbonSum, 'year', 'carbonSum')
                    .setOptions(chartStyle);

print(carbonChartLU);

//======================================================//
//                   Carbon Functions                   //
//======================================================//

function applyCarbonGrowthFunction(img, fc, params){
  // calculates carbon by applying carbon equation to stand age
  // returns: image
  var standAge = img.select("standAge");
  var carbon = carbonByFeatureCollection(standAge, fc, params);//.select('carbon');
  
  return img.addBands(carbon);
}

function carbonByFeatureCollection(image, fc, params){
  // applies a carbon growth function defined by regions (fc) to an image 
  // growth function paramaters should be defined in the params dictionary
  // where each key matches a 'carbon_id' property in the input feature
  // collection.
  params = ee.Dictionary(params);
  
  var icCarbonByFc = fc.map(function(f){
    // get the carbon id and unique paramters from the params dict
    var fid = ee.Feature(f).get('carbon_id');
    var fparam = ee.Dictionary(params.get(fid));
    
    // unpack coefs for carbon growth func, cast to number so ee knows
    // how to use
    var b0 = ee.Number(fparam.get('b0'));
    var exp = ee.Number(fparam.get('b1'));
    var b2 = ee.Number(fparam.get('b2'));
    
    //unpack high CI values
    var b0_highCI = ee.Number(fparam.get('b0_highCI'));
    var exp_highCI = ee.Number(fparam.get('b1_highCI'));
    var b2_highCI = ee.Number(fparam.get('b2_highCI'));
    
    //unpack low CI values
    var b0_lowCI = ee.Number(fparam.get('b0_lowCI'));
    var exp_lowCI = ee.Number(fparam.get('b1_lowCI'));
    var b2_lowCI = ee.Number(fparam.get('b2_lowCI'));

    // apply to whole image and clip to feature region.
    // if feature is overly complex it is likly to time out
    // lmk if you need to use complex geometries... there are more 
    // complex work arounds (simplest option is to paint outputs to an image)
    // pseudo code:
    // outimg = ee.Image().float()
    // values = carbonFunc(imgs, params,)
    // outimg = outimg.paint(f, values)
    return carbonGrowthFunctionGeneral(image, b0, exp, b2, b0_lowCI, exp_lowCI, b2_lowCI, b0_highCI, exp_highCI, b2_highCI).clip(f);
    
  });
  return ee.ImageCollection(icCarbonByFc).mosaic();
}

function carbonGrowthFunctionGeneral(standAge, b0, b1, b2, b0_lowCI, b1_lowCI, b2_lowCI, b0_highCI, b1_highCI, b2_highCI){
  // b0(1-EXP(-b2Age))^b2
  b1 = b1.multiply(-1); //multiply by negative 1 to match formula since cannot use exp() in expression.
  var carbonHa = ee.Image(0).expression("b0 *( 1 - exp) ** b2",{
    'b0': ee.Image(b0),
    'exp': standAge.multiply(b1).exp(),
    'b2': ee.Image(b2)
  }).multiply(0.09).rename('carbon');
  
  b1_highCI = b1_highCI.multiply(-1); //multiply by negative 1 to match formula since cannot use exp() in expression.
  var c_high = ee.Image(0).expression("b0 *( 1 - exp) ** b2",{
    'b0': ee.Image(b0_highCI),
    'exp': standAge.multiply(b1_highCI).exp(),
    'b2': ee.Image(b2_highCI)
  }).multiply(0.09);
  
  
  b1_lowCI = b1_lowCI.multiply(-1); //multiply by negative 1 to match formula since cannot use exp() in expression.
  var c_low = ee.Image(0).expression("b0 *( 1 - exp) ** b2",{
    'b0': ee.Image(b0_lowCI),
    'exp': standAge.multiply(b1_lowCI).exp(),
    'b2': ee.Image(b2_lowCI)
  }).multiply(0.09);
  
  var carbonHaHigh = ee.Image(0).expression("((c_high-c)/1.96)**2",{
    'c': carbonHa,
    'c_high':c_high
  }).rename('carbon_highCI');
  
  var carbonHaLow = ee.Image(0).expression("((c-c_low)/1.96)**2",{
    'c': carbonHa,
    'c_low':c_low
  }).rename('carbon_lowCI');
  
  return carbonHa.addBands(carbonHaHigh).addBands(carbonHaLow);
}
