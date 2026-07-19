import { Coordinate } from "./types";
const R=6371000, rad=(n:number)=>(n*Math.PI)/180, deg=(n:number)=>(n*180)/Math.PI;
export function haversineMeters(a:Coordinate,b:Coordinate){const dLat=rad(b[1]-a[1]),dLon=rad(b[0]-a[0]),lat1=rad(a[1]),lat2=rad(b[1]);const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function local(p:Coordinate,o:Coordinate):[number,number]{return [rad(p[0]-o[0])*R*Math.cos(rad(o[1])),rad(p[1]-o[1])*R]}
export function distanceToSegmentMeters(p:Coordinate,a:Coordinate,b:Coordinate){const [px,py]=local(p,a),[bx,by]=local(b,a),l=bx*bx+by*by;if(!l)return haversineMeters(p,a);const t=Math.max(0,Math.min(1,(px*bx+py*by)/l));return Math.hypot(px-t*bx,py-t*by)}
export function nearestSegment(p:Coordinate,r:Coordinate[]){let index=0,distance=Infinity;for(let i=0;i<r.length-1;i++){const d=distanceToSegmentMeters(p,r[i],r[i+1]);if(d<distance){distance=d;index=i}}return {index,distance}}
export function remainingDistanceMeters(p:Coordinate,r:Coordinate[],i:number){let total=haversineMeters(p,r[i+1]);for(let x=i+1;x<r.length-1;x++)total+=haversineMeters(r[x],r[x+1]);return total}
export function bearingDegrees(a:Coordinate,b:Coordinate){const l1=rad(a[1]),l2=rad(b[1]),d=rad(b[0]-a[0]);return (deg(Math.atan2(Math.sin(d)*Math.cos(l2),Math.cos(l1)*Math.sin(l2)-Math.sin(l1)*Math.cos(l2)*Math.cos(d)))+360)%360}
