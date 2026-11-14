import {expect,it} from 'vitest';
import {storyImage} from '../src/lib/story-image';
import type {PublishedArticle} from '../src/lib/editorial';
const article={withdrawn:false,card_image:{url:'https://example.test/hero.jpg',alt:'Stored alternative text'},blocks:[{type:'image',text:'',url:'https://example.test/hero.jpg',credit:'Stored photographer',caption:'Stored caption'}]} as PublishedArticle;
it('retains stored image credits and captions with the selected hero',()=>{expect(storyImage(article)).toMatchObject({credit:'Stored photographer',caption:'Stored caption',alt:'Stored alternative text'});});
it('does not invent credits or show withdrawn and unsafe images',()=>{
 expect(storyImage({...article,blocks:[]})).toMatchObject({credit:'',caption:''});
 expect(storyImage({...article,withdrawn:true})).toBeNull();
 expect(storyImage({...article,card_image:{url:'javascript:alert(1)',alt:''},blocks:[]})).toBeNull();
});
