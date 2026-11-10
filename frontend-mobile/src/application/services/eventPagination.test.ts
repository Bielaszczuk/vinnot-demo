import { mapEventPagination } from './eventPagination';

it('maps the actual top-level backend wrapper and its navigation', () => {
  expect(mapEventPagination({pageNumber:1,pageSize:10,totalItems:21,totalPages:3})).toEqual({
    pageNumber:1,pageSize:10,totalItems:21,totalPages:3,hasNext:true,hasPrevious:true,
  });
});
it('maps nested discovery pages and preserves an empty page', () => {
  expect(mapEventPagination({page:0,size:10,totalElements:0,totalPages:0})).toEqual({
    pageNumber:0,pageSize:10,totalItems:0,totalPages:0,hasNext:false,hasPrevious:false,
  });
  expect(mapEventPagination({page:2,size:10,totalElements:21,totalPages:3}).hasNext).toBe(false);
});
it('uses requested paging when omitted and prioritizes the current wrapper contract', () => {
  expect(mapEventPagination({totalPages:0},0,50).pageSize).toBe(50);
  expect(mapEventPagination({pageNumber:0,page:2,pageSize:10,size:20,totalItems:0,totalElements:5,totalPages:0})).toMatchObject({pageNumber:0,pageSize:10,totalItems:0});
});
