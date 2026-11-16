-- The published universal signed APK is 53,680,280 bytes, above 50 MiB.
-- Keep a bounded 64 MiB bucket limit; ordinary private-file limits stay intact.
update storage.buckets set file_size_limit=67108864 where id='android-releases';
