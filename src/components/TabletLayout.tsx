import React from 'react';
export function TabletHeading({title,subtitle}:{title:string;subtitle:string}){return <header className="tablet-page-heading"><h1>{title}</h1><p>{subtitle}</p></header>;}
export function TabletTabs({items,value,onChange}:{items:{key:string;label:string}[];value:string;onChange:(key:string)=>void}){return <nav className="tablet-tabs" aria-label="Page sections">{items.map(item=><button key={item.key} aria-current={value===item.key?'page':undefined} onClick={()=>onChange(item.key)}>{item.label}</button>)}</nav>;}
