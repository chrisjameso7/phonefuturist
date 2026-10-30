import { rectangleFromDiagonal } from '../simulation/modules/geometry';
import type { DeviceConcept } from './device-concepts';
import type { DeviceDesign } from './device-design';
export function displayGeometry(diagonal: number, aspectWidth: number, aspectHeight: number, bodyWidth: number, bodyHeight: number, bezel=.5) {
  const size = rectangleFromDiagonal(diagonal, aspectWidth, aspectHeight);
  const fitDiagonal = Math.min((bodyWidth-2*bezel) / aspectWidth, (bodyHeight-2*bezel) / aspectHeight) * Math.hypot(aspectWidth,aspectHeight) / 25.4;
  const valid = !!size && Number.isFinite(diagonal) && diagonal > 0 && size.width <= bodyWidth-2*bezel+.001 && size.height <= bodyHeight-2*bezel+.001;
  return { sideBezel:(bodyWidth-(size?.width??0))/2,topBezel:(bodyHeight-(size?.height??0))/2,width: size?.width ?? 0, height: size?.height ?? 0, maxDiagonal: Math.max(.5,fitDiagonal), valid };
}
export function conceptGeometry(c: DeviceConcept) {
  const primary=displayGeometry(c.diagonal,c.aspectWidth??c.pixelWidth,c.aspectHeight??c.pixelHeight,c.width,c.height,c.bezel??1);
  const book=c.formFactor==='book_foldable', flip=c.formFactor==='flip_foldable';
  const cover=book||flip?displayGeometry(c.coverDiagonal,c.coverAspectWidth??c.coverWidth,c.coverAspectHeight??c.coverHeight,book?c.width/2:c.width,flip?c.height/2:c.height,c.coverBezel??1):null;
  return { primary, cover, valid:primary.valid&&(!cover||cover.valid) };
}
export function conceptDesign(c: DeviceConcept, hingeAngle: number): DeviceDesign {
  const g=conceptGeometry(c);
  return { name:c.name,width:c.width,height:c.height,thickness:c.thickness,bezel:1,material:'titanium',color:'#68717d',camera:'triple',cameraCount:2,
    kind:c.formFactor,hingeAngle,displayWidth:g.primary.valid?g.primary.width:0,displayHeight:g.primary.valid?g.primary.height:0,
    coverDisplayWidth:g.cover?.valid?g.cover.width:0,coverDisplayHeight:g.cover?.valid?g.cover.height:0 };
}

export function withConceptBezel(c:DeviceConcept,cover:boolean,bezel:number):DeviceConcept{
  const next={...c,[cover?'coverBezel':'bezel']:bezel};
  const g=conceptGeometry(next),display=cover?g.cover:g.primary;
  return {...next,[cover?'coverDiagonal':'diagonal']:display?.maxDiagonal??c.diagonal};
}
export function fitConceptChassis(c:DeviceConcept):DeviceConcept{
  const g=conceptGeometry(c),b=c.bezel??1,cb=c.coverBezel??1,book=c.formFactor==='book_foldable',flip=c.formFactor==='flip_foldable';
  const width=Math.max(c.width,g.primary.width+2*b,(g.cover?.width??0)*(book?2:1)+2*cb*(book?2:1));
  const height=Math.max(c.height,g.primary.height+2*b,(g.cover?.height??0)*(flip?2:1)+2*cb*(flip?2:1));
  return {...c,width,height};
}
