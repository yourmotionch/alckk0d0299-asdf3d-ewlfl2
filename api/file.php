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
if (!isset($config['files']) || !is_array($config['files'])) $config['files'] = [];

$saved = 0;
$saved_names = [];

function unique_name(string $dir, string $safe): string {
  $base = pathinfo($safe, PATHINFO_FILENAME);
  $ext  = pathinfo($safe, PATHINFO_EXTENSION);
  $candidate = $safe;
  $i = 2;
  while (file_exists($dir . '/' . $candidate)) {
    $candidate = $base . '_' . $i . ($ext ? ('.' . $ext) : '');
    $i++;
  }
  return $candidate;
}

function add_file_entry(array &$files, string $path, string $name): void {
  $mime = @mime_content_type($path); if (!$mime) { $mime = 'application/octet-stream'; }
  $size = @filesize($path); if (!$size) { $size = 0; }
  // replace or append
  $found = false;
  foreach ($files as &$f) {
    if (($f['name'] ?? '') === $name) { $f = ['name'=>$name,'size'=>$size,'mime'=>$mime]; $found = true; break; }
  }
  if (!$found) $files[] = ['name'=>$name,'size'=>$size,'mime'=>$mime];
}

if (!empty($_FILES)) {
  // single 'file'
  if (!empty($_FILES['file'])) {
    $name = $_FILES['file']['name'];
    $tmp  = $_FILES['file']['tmp_name'];
    $err  = $_FILES['file']['error'];
    if ($err === UPLOAD_ERR_OK) {
      $safe = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $name);
      $safe = unique_name($dir, $safe);
      $dest = $dir . '/' . $safe;
      if (!move_uploaded_file($tmp, $dest)) { if (!copy($tmp, $dest)) send_json(['ok'=>false,'error'=>'move_failed'], 500); }
      add_file_entry($config['files'], $dest, $safe);
      $saved++;
      $saved_names[] = $safe;
    }
  }
  // multiple 'files[]'
  if (!empty($_FILES['files'])) {
    $files = $_FILES['files'];
    $count = is_array($files['name']) ? count($files['name']) : 0;
    for ($i=0; $i<$count; $i++) {
      $name = $files['name'][$i];
      $tmp  = $files['tmp_name'][$i];
      $err  = $files['error'][$i];
      if ($err !== UPLOAD_ERR_OK) continue;
      $safe = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $name);
      $safe = unique_name($dir, $safe);
      $dest = $dir . '/' . $safe;
      if (!move_uploaded_file($tmp, $dest)) { if (!copy($tmp, $dest)) continue; }
      add_file_entry($config['files'], $dest, $safe);
      $saved++;
      $saved_names[] = $safe;
    }
  }
}

// optional meta merge
if (!empty($_POST['meta'])) {
  $meta = json_decode($_POST['meta'], true);
  if (is_array($meta)) {
    foreach (['title','description','labels','pages'] as $k) {
      if (isset($meta[$k])) $config[$k] = $meta[$k];
    }
  }
}

$config['uuid'] = $uuid;
$config['page_count'] = (isset($config['pages']) && is_array($config['pages'])) ? count($config['pages']) : count($config['files']);
$config['updated_at'] = gmdate('c');
file_put_contents($configPath, json_encode($config, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));

send_json(['ok'=>true,'saved'=>$saved,'saved_files'=>$saved_names]);
