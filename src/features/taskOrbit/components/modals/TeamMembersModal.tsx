import {useState} from 'react';
import {useTaskOrbit} from '../../context/TaskOrbitContext';
import {Avatar} from '../common/Avatar';
export function TeamMembersModal(){
 const {isTeamModalOpen,setTeamModalOpen,users,systemGroups}=useTaskOrbit();const [group,setGroup]=useState('');
 if(!isTeamModalOpen)return null;
 return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"><section className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-950 text-slate-200 p-5 space-y-4"><header className="flex justify-between gap-4"><h3 className="font-semibold">System Groups & Users</h3><button aria-label="Close team members" onClick={()=>setTeamModalOpen(false)}>×</button></header><p className="text-xs text-slate-400">Membership and permissions are managed in User Management.</p><select aria-label="Filter users by group" className="w-full border border-slate-700 bg-slate-900 rounded-lg p-2 text-xs" value={group} onChange={event=>setGroup(event.target.value)}><option value="">All groups</option>{systemGroups.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><ul className="max-h-[60vh] overflow-auto divide-y divide-slate-800">{users.filter(user=>!group||user.groupId===group).map(user=><li key={user.id} className="py-3 flex items-center gap-3"><Avatar user={user}/><div><p className="text-sm">{user.name}</p><p className="text-xs text-slate-400">{user.groupName}</p></div></li>)}</ul></section></div>;
}
