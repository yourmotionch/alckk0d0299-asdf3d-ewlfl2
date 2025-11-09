<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';

$uuid = get_uuid_from_uri();
if ($uuid === null) { send_json(['ok'=>false,'error'=>'invalid_or_missing_uuid'], 400); }

$storageRoot = realpath(__DIR__ . '/../data');
$publicRoot  = realpath(__DIR__ . '/../public');
if ($storageRoot === false) { $storageRoot = __DIR__ . '/../data'; }
if ($publicRoot  === false) { $publicRoot  = __DIR__ . '/../public'; }
ensure_dirs($storageRoot);
ensure_dirs($publicRoot);

$target = $storageRoot . '/' . $uuid;
$link   = $publicRoot . '/' . $uuid;

if (!is_dir($target)) {
  send_json(['ok'=>false,'error'=>'uuid_not_found'], 404);
}

// Try to create a symlink (may need permissions). If it exists, refresh it.
if (is_link($link) || is_dir($link)) {
  // remove existing
  if (is_link($link)) { unlink($link); }
  else {
    // remove directory
    $files = new RecursiveIteratorIterator(
      new RecursiveDirectoryIterator($link, RecursiveDirectoryIterator::SKIP_DOTS),
      RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($files as $fileinfo) {
      $todo = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
      $todo($fileinfo->getRealPath());
    }
    rmdir($link);
  }
}

$ok = @symlink($target, $link);
if (!$ok) {
  // Fallback: create a copy directory
  if (!mkdir($link, 0775, true) && !is_dir($link)) {
    send_json(['ok'=>false,'error'=>'symlink_failed_and_copy_mkdir_failed'], 500);
  }
  // copy minimal files (config + images)
  $dir = opendir($target);
  if ($dir !== false) {
    while (($f = readdir($dir)) !== false) {
      if ($f === '.' || $f === '..') continue;
      @copy($target . '/' . $f, $link . '/' . $f);
    }
    closedir($dir);
  }
}

$publicUrl = '/public/' . $uuid; // Adjust base URL if needed
send_json(['ok'=>true,'public'=>$publicUrl]);
