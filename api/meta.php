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
$existing = file_exists($configPath) ? json_decode(file_get_contents($configPath), true) : [];
if (!is_array($existing)) $existing = [];

$input = file_get_contents('php://input');
$data = json_decode($input, true);
if ($data === null) { send_json(['ok'=>false,'error'=>'invalid_json'], 400); }

$existing['uuid'] = $uuid;
if (isset($data['title'])) $existing['title'] = (string)$data['title'];
if (isset($data['description'])) $existing['description'] = (string)$data['description'];
if (isset($data['labels']) && is_array($data['labels'])) $existing['labels'] = $data['labels'];
if (isset($data['pages']) && is_array($data['pages'])) $existing['pages'] = $data['pages'];

if (!isset($existing['files']) || !is_array($existing['files'])) $existing['files'] = [];
$existing['page_count'] = isset($existing['pages']) && is_array($existing['pages']) ? count($existing['pages']) : count($existing['files']);
$existing['updated_at'] = gmdate('c');

file_put_contents($configPath, json_encode($existing, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));
send_json(['ok'=>true, 'saved'=>true]);
