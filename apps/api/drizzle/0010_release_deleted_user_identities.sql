-- 이미 soft delete된 사용자의 로그인 정체성을 풀어 준다(데이터 전용, 스키마 변경 없음).
-- 이메일(unique)과 Google 계정 연결(account)이 남아 있으면 같은 사람이 다시 로그인했을 때
-- Better Auth가 삭제된 행으로 로그인시키고 모든 요청이 401이 되어 다시 가입할 수 없다.
-- 이제 삭제 시점에 user.repository.deleteUser가 같은 처리를 하므로, 이 마이그레이션은
-- 그 이전에 삭제된 행만 한 번 정리한다. 여러 번 실행돼도 결과는 같다.
UPDATE `user`
SET `email` = 'deleted+' || `id` || '@deleted.invalid'
WHERE `deleted_at` IS NOT NULL
	AND `email` NOT LIKE 'deleted+%@deleted.invalid';
--> statement-breakpoint
DELETE FROM `account`
WHERE `user_id` IN (SELECT `id` FROM `user` WHERE `deleted_at` IS NOT NULL);
--> statement-breakpoint
DELETE FROM `session`
WHERE `user_id` IN (SELECT `id` FROM `user` WHERE `deleted_at` IS NOT NULL);
