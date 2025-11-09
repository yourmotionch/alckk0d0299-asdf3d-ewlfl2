<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';
$uuid = get_uuid_from_uri();
if ($uuid === null) { send_json(['ok'=>false,'error'=>'invalid_or_missing_uuid'], 400); }

$storageRoot = realpath(__DIR__ . '/../data');
if ($storageRoot === false) { $storageRoot = __DIR__ . '/../data'; }
$dir = $storageRoot . '/' . $uuid;
if (!is_dir($dir)) { send_json(['ok'=>false,'error'=>'uuid_not_found'], 404); }

$filename = $_POST['filename'] ?? null;
if (!$filename) { send_json(['ok'=>false,'error'=>'missing_filename'], 400); }

$path = $dir . '/' . basename($filename);
if (file_exists($path)) { @unlink($path); }

$configPath = $dir . '/config.json';
$config = file_exists($configPath) ? json_decode(file_get_contents($configPath), true) : [];
if (!is_array($config)) $config = [];
if (!isset($config['files']) || !is_array($config['files'])) $config['files'] = [];

$config['files'] = array_values(array_filter($config['files'], function($f) use ($filename) {
  return ($f['name'] ?? '') !== $filename;
}));

if (isset($config['pages']) && is_array($config['pages'])) {
  $config['pages'] = array_values(array_filter($config['pages'], function($p) use ($filename) {
    return ($p['filename'] ?? '') !== $filename;
  }));
}

$config['page_count'] = isset($config['pages']) ? count($config['pages']) : count($config['files']);
$config['updated_at'] = gmdate('c');
file_put_contents($configPath, json_encode($config, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));

send_json(['ok'=>true,'deleted'=>$filename]);
