// -------------------------------------------------------------------------------
// Workload tags module
// Authors: dnekorchuk
// Description: Export a value so that all scripts can use the same GEE workload tag per deal. 
// Last updated & by: 2023-05-01 by dnekorchuk
// -------------------------------------------------------------------------------
// Change log
// 2023-05-11: Added tag for ReforesTerra
// 2023-05-01: Added tag for INOCAS
// 2023-03-20: Moved higher up in the folder hierarchy and adapted to be tags 
//    for all TerraBio projects, dnekorchuk.
// 2023-03-06: Creation, added common Horta tag for use in all Horta scripts, dnekorchuk
// -------------------------------------------------------------------------------

//Workload tags for all TerraBio projects
//  Note: it is recommended that tags do not contain names or identifiers
var hortaTag = 'terrabio-h'; // (h)orta
var apuiTag = 'terrabio-ca'; // (c)afe (a)pui
var inocasTag = 'terrabio-i'; // (i)nocas
var reforesterraTag = 'terrabio-r'; // (r)eforesTerra

exports.tags = {
  hortaTag:hortaTag,
  apuiTag:apuiTag,
  inocasTag:inocasTag,
  reforesterraTag:reforesterraTag
};

////In scripts, will use e.g.
// var workTags = require('users/an-sig/TerraBio:workload tags');
// ee.data.setDefaultWorkloadTag(workTags.tags.[this]Tag);