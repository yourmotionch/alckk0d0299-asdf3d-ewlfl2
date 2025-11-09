<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';

$uuid = get_uuid_from_uri();
if ($uuid === null) { send_json(['ok'=>false,'error'=>'invalid_or_missing_uuid'], 400); }

$storageRoot = realpath(__DIR__ . '/../data');
if ($storageRoot === false) { $storageRoot = __DIR__ . '/../data'; }
ensure_dirs($storageRoot);
$dir = $storageRoot . '/' . $uuid;
ensure_dirs($dir);

$configPath = $dir . '/config.json';
$config = file_exists($configPath) ? json_decode(file_get_contents($configPath), true) : [];
if (!is_array($config)) $config = [];
if (!isset($config['attachments']) || !is_array($config['attachments'])) $config['attachments'] = [];

function unique_name(string $dir, string $safe): string {
  $base = pathinfo($safe, PATHINFO_FILENAME);
  $ext  = pathinfo($safe, PATHINFO_EXTENSION);
  $candidate = $safe; $i = 2;
  while (file_exists($dir . '/' . $candidate)) {
    $candidate = $base . '_' . $i . ($ext ? ('.' . $ext) : '');
    $i++;
  }
  return $candidate;
}

$saved = 0; $saved_names = [];

if (!empty($_FILES['file'])) {
  $name = $_FILES['file']['name'];
  $tmp  = $_FILES['file']['tmp_name'];
  $err  = $_FILES['file']['error'];
  if ($err === UPLOAD_ERR_OK) {
    $safe = preg_replace('/[^a-zA-Z0-9_\\-\\.]/', '_', $name);
    $safe = unique_name($dir, $safe);
    $dest = $dir . '/' . $safe;
    if (!move_uploaded_file($tmp, $dest)) { if (!copy($tmp, $dest)) send_json(['ok'=>false,'error'=>'move_failed'], 500); }
    $mime = @mime_content_type($dest); if (!$mime) { $mime = 'application/octet-stream'; }
    $size = @filesize($dest); if (!$size) { $size = 0; }
    $config['attachments'][] = ['name'=>$safe, 'size'=>$size, 'mime'=>$mime];
    $saved++; $saved_names[] = $safe;
  }
}

$config['updated_at'] = gmdate('c');
file_put_contents($configPath, json_encode($config, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));
send_json(['ok'=>true,'saved'=>$saved,'attachments'=>$saved_names]);
