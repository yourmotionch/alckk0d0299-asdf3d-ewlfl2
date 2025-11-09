<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';
$uuid = get_uuid_from_uri();
if ($uuid === null) { send_json(['ok'=>false,'error'=>'invalid_or_missing_uuid'], 400); }

$storageRoot = realpath(__DIR__ . '/../data');
if ($storageRoot === false) { $storageRoot = __DIR__ . '/../data'; }
$dir = $storageRoot . '/' . $uuid;
if (!is_dir($dir)) { send_json(['ok'=>false,'error'=>'uuid_not_found'], 404); }

$input = file_get_contents('php://input');
$data = json_decode($input, true);
if ($data === null || !isset($data['order']) || !is_array($data['order'])) {
  send_json(['ok'=>false,'error'=>'invalid_order'], 400);
}
$order = $data['order']; // array of filenames

$configPath = $dir . '/config.json';
$config = file_exists($configPath) ? json_decode(file_get_contents($configPath), true) : [];
if (!is_array($config)) $config = [];
$pages = $config['pages'] ?? [];

// index by filename
$byFile = [];
foreach ($pages as $p) { if (isset($p['filename'])) $byFile[$p['filename']] = $p; }

$newPages = [];
foreach ($order as $fname) {
  if (isset($byFile[$fname])) {
    $newPages[] = $byFile[$fname];
  } else {
    // if page entry missing, create minimal
    $newPages[] = ['filename'=>$fname, 'index'=>count($newPages)+1];
  }
}
$config['pages'] = $newPages;
$config['page_count'] = count($newPages);
$config['updated_at'] = gmdate('c');
file_put_contents($configPath, json_encode($config, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));

send_json(['ok'=>true,'reordered'=>count($newPages)]);
