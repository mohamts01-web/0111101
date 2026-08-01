update public.credit_products set paddle_price_id = case id
  when 'credits_10' then 'pri_01kxbh8vkar3mh4t1hddrzfmbm'
  when 'credits_20' then 'pri_01kxbh8waen0jd882g4dc4p85p'
  when 'credits_30' then 'pri_01kxbh8x287x7qsbz352gec5fs'
  when 'credits_50' then 'pri_01kxbh8xyevm57akv69j74e549'
  when 'credits_75' then 'pri_01kxbh8ytts5p8d0qwrmf28jhs'
  when 'credits_100' then 'pri_01kxbh8zjtejryrfbmhsh2ba2y'
  when 'credits_150' then 'pri_01kxbh909cezmp5ens8fkwsm32'
  when 'credits_200' then 'pri_01kxbh912p6nwyfyzed9x1gpr7'
  when 'credits_300' then 'pri_01kxbh91s1wf8ty0q4havt20kj'
  when 'credits_500' then 'pri_01kxbh92fh17vwxczdj3ywnwhw'
  else paddle_price_id
end;
