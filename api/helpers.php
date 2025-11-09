<?php
declare(strict_types=1);

function send_json($data, int $code=200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function ensure_dirs(string $base): void {
  if (!is_dir($base)) { mkdir($base, 0775, true); }
}

function is_valid_uuid(string $uuid): bool {
  return (bool)preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid);
}

function get_uuid_from_uri(): ?string {
  $uri = $_SERVER['REQUEST_URI'] ?? '';
  // Expecting /api/upload/{uuid} or /api/symlink/{uuid}
  $parts = explode('/', trim($uri, '/'));
  if (count($parts) >= 3) {
    $candidate = $parts[2];
    if (is_valid_uuid($candidate)) return $candidate;
  }
  // fallback to query param
  if (!empty($_GET['uuid']) && is_valid_uuid($_GET['uuid'])) return $_GET['uuid'];
  if (!empty($_POST['uuid']) && is_valid_uuid($_POST['uuid'])) return $_POST['uuid'];
  return null;
}
