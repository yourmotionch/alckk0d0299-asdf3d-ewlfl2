<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';

$uuid = get_uuid_from_uri();
if ($uuid === null) { send_json(['ok'=>false,'error'=>'invalid_or_missing_uuid'], 400); }

$storageRoot = realpath(__DIR__ . '/../data');
if ($storageRoot === false) { $storageRoot = __DIR__ . '/../data'; }
$dir = $storageRoot . '/' . $uuid;
if (!is_dir($dir)) { send_json(['ok'=>false,'error'=>'uuid_not_found'], 404); }

$configPath = $dir . '/config.json';
$config = file_exists($configPath) ? json_decode(file_get_contents($configPath), true) : [];
if (!is_array($config)) $config = [];

$filename = $_POST['filename'] ?? '';
if (!$filename) { send_json(['ok'=>false,'error'=>'missing_filename'], 400); }

$path = $dir . '/' . basename($filename);
if (file_exists($path)) { @unlink($path); }

if (isset($config['attachments']) && is_array($config['attachments'])) {
  $config['attachments'] = array_values(array_filter($config['attachments'], function($a) use ($filename){
    return ($a['name'] ?? '') !== $filename;
  }));
}

$config['updated_at'] = gmdate('c');
file_put_contents($configPath, json_encode($config, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));
send_json(['ok'=>true,'deleted'=>$filename]);
