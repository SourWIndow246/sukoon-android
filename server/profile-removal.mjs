// Durable cleanup queue: interrupted file deletion is retried after server restart.
export async function cleanRemovedFiles(db) {
  const {data:jobs,error}=await db.from('removed_profile_files').select('profile_id,owner_id').limit(20);
  if(error)throw new Error('Could not read file cleanup queue');
  for(const job of jobs) {
    const bucket=db.storage.from('medical-records');
    const prefix=`${job.owner_id}/${job.profile_id}`;
    for(;;) {
      const {data:files,error:listError}=await bucket.list(prefix,{limit:100});
      if(listError)throw new Error('Could not list removed files');
      if(!files.length)break;
      const {error:removeError}=await bucket.remove(files.map(file=>`${prefix}/${file.name}`));
      if(removeError)throw new Error('Could not clean removed files');
    }
    const {error:doneError}=await db.from('removed_profile_files').delete().eq('profile_id',job.profile_id).eq('owner_id',job.owner_id);
    if(doneError)throw new Error('Could not complete file cleanup');
  }
}
