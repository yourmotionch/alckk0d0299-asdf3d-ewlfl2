<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';

$uuid = get_uuid_from_uri();
if ($uuid === null) { send_json(['ok'=>false,'error'=>'invalid_or_missing_uuid'], 400); }

$storageRoot = realpath(__DIR__ . '/../data'); if ($storageRoot === false) { $storageRoot = __DIR__ . '/../data'; }
ensure_dirs($storageRoot); 
$dir = $storageRoot . '/' . $uuid;
if (!is_dir($dir)) { send_json(['ok'=>false,'error'=>'uuid_not_found'], 404); }

$configPath = $dir . '/config.json';
$config = file_exists($configPath) ? json_decode(file_get_contents($configPath), true) : [];
if (!is_array($config)) $config = [];

$files = [];
$dh = @opendir($dir);
if ($dh !== false) {
  while (($f = readdir($dh)) !== false) {
    if ($f==='.' || $f==='..') continue;
    if ($f === 'config.json') continue;
    $files[] = $f;
  }
  closedir($dh);
}
// Build simple file map with public URLs
$baseUrl = './data/' . $uuid . '/';
$fileInfos = array_map(function($name) use ($dir, $baseUrl) {
  $p = $dir . '/' . $name;
  return [
    'name' => $name,
    'size' => @filesize($p) ?: 0,
    'mime' => @mime_content_type($p) ?: 'application/octet-stream',
    'url'  => $baseUrl . rawurlencode($name),
  ];
}, $files);

// Merge with config files list if present
if (!isset($config['files']) || !is_array($config['files']) || count($config['files']) === 0) {
  $config['files'] = array_map(function($fi){ return ['name'=>$fi['name'], 'size'=>$fi['size'], 'mime'=>$fi['mime']]; }, $fileInfos);
}

send_json(['ok'=>true, 'uuid'=>$uuid, 'config'=>$config, 'files'=>$fileInfos, 'base'=>'./data/'.$uuid]);
