<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';
$uuid = get_uuid_from_uri();
if ($uuid === null) { send_json(['ok'=>false,'error'=>'invalid_or_missing_uuid'],400); }
$storage = realpath(__DIR__.'/../data'); if(!$storage){$storage=__DIR__.'/../data';}

$td = $storage.'/'.$uuid;


function rrmdir($d){
 if(!is_dir($d)) return;
 $it=new RecursiveIteratorIterator(
   new RecursiveDirectoryIterator($d,RecursiveDirectoryIterator::SKIP_DOTS),
   RecursiveIteratorIterator::CHILD_FIRST
 );
 foreach($it as $f){ $todo=($f->isDir()?'rmdir':'unlink'); $todo($f->getRealPath()); }
 rmdir($d);
}

if(is_dir($td)) rrmdir($td);
send_json(['ok'=>true,'deleted'=>$uuid]);
