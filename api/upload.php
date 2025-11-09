<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';

$storageRoot = realpath(__DIR__ . '/../data');
if ($storageRoot === false) { $storageRoot = __DIR__ . '/../data'; }
ensure_dirs($storageRoot);

$uuid = get_uuid_from_uri();
if ($uuid === null) {
  send_json(['ok'=>false,'error'=>'invalid_or_missing_uuid'], 400);
}

$targetDir = $storageRoot . '/' . $uuid;
ensure_dirs($targetDir);

$meta = null;
if (isset($_POST['meta'])) {
  $meta = json_decode($_POST['meta'], true);
  if ($meta === null) {
    send_json(['ok'=>false,'error'=>'invalid_meta_json'], 400);
  }
}

// Save files
$saved = [];

function unique_name(string $dir, string $safe): string {
  $base = pathinfo($safe, PATHINFO_FILENAME);
  $ext = pathinfo($safe, PATHINFO_EXTENSION);
  $candidate = $safe;
  $i = 2;
  while (file_exists($dir . '/' . $candidate)) {
    $candidate = $base . '_' . $i . ($ext ? ('.' . $ext) : '');
    $i++;
  }
  return $candidate;
}

if (!empty($_FILES['files'])) {
  $files = $_FILES['files'];
  $count = is_array($files['name']) ? count($files['name']) : 0;
  for ($i=0; $i < $count; $i++) {
    $name = $files['name'][$i];
    $tmp  = $files['tmp_name'][$i];
    $err  = $files['error'][$i];
    if ($err !== UPLOAD_ERR_OK) { continue; }
    $safe = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $name);
    $safe = unique_name($targetDir, $safe);
    $dest = $targetDir . '/' . $safe;
    if (!move_uploaded_file($tmp, $dest)) {
      // fallback copy if not an uploaded file (some servers / proxies)
      if (!copy($tmp, $dest)) {
        send_json(['ok'=>false,'error'=>'move_failed','file'=>$name], 500);
      }
    }
    $saved[] = ['name'=>$safe, 'size'=>filesize($dest) ?: 0, 'mime'=>mime_content_type($dest) ?: 'application/octet-stream'];
  }
}

// Write config.json
$config = [
  'uuid' => $uuid,
  'title' => $meta['title'] ?? '',
  'description' => $meta['description'] ?? '',
  'labels' => $meta['labels'] ?? [],
  'page_count' => $meta['page_count'] ?? count($saved),
  'pages' => $meta['pages'] ?? [],
  'files' => $saved,
  'created_at' => $meta['created_at'] ?? gmdate('c')
];

file_put_contents($targetDir . '/config.json', json_encode($config, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));

send_json(['ok'=>true,'saved'=>count($saved),'path'=>basename($targetDir)]);
