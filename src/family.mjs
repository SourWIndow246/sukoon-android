// Remove only this member's data, and unlink their biological-parent references.
export function withoutMember(data,id) {
  return {...data,profiles:data.profiles.filter(p=>p.id!==id).map(p=>({...p,parentIds:p.parentIds.filter(parent=>parent!==id)})),records:data.records.filter(r=>r.profileId!==id),chats:data.chats.filter(c=>c.profileId!==id)};
}
