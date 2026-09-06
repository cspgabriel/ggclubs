-- Seed inicial do GGClubs
INSERT OR IGNORE INTO users (id, email, handle, display_name, role) VALUES
  ('usr_admin_1', 'admin@ggclubs.com.br', 'admin', 'GGClubs Diretor', 'admin'),
  ('usr_player_1', 'gabriel@ggclubs.com.br', 'briel', 'Gabriel C.', 'player'),
  ('usr_player_2', 'lucas@ggclubs.com.br', 'lucas9', 'Lucas Matador', 'player'),
  ('usr_player_3', 'diego@ggclubs.com.br', 'diegocb', 'Diego Paredão', 'player');

INSERT OR IGNORE INTO clubs (id, name, tag, logo_url, description, owner_id) VALUES
  ('clb_1', 'Flamengo Pro Clubs', 'FLA', 'https://cdn.ggclubs.com.br/crests/fla.png', 'Time oficial de Pro Clubs da Nação', 'usr_player_1'),
  ('clb_2', 'Corinthians Esports', 'SCCP', 'https://cdn.ggclubs.com.br/crests/sccp.png', 'O time do povo no EA FC Pro Clubs', 'usr_player_2'),
  ('clb_3', 'Palmeiras E-Sports', 'SEP', 'https://cdn.ggclubs.com.br/crests/sep.png', 'Campeões da Copa América de Pro Clubs', 'usr_player_3'),
  ('clb_4', 'Barcelona FC Pro', 'FCB', 'https://cdn.ggclubs.com.br/crests/fcb.png', 'Tiki-taka no futebol virtual', 'usr_admin_1');

INSERT OR IGNORE INTO tournaments (id, title, description, format, max_teams, registered_teams, prize_pool, status, starts_at) VALUES
  ('trn_open_2026', 'Copa GGClubs Pro - Temporada 1', 'Campeonato oficial de Pro Clubs com premiação em dinheiro e transmissão ao vivo.', 'GROUPS_AND_KNOCKOUT', 16, 8, 'R$ 2.500,00', 'OPEN', '2026-09-15 21:00:00');

INSERT OR IGNORE INTO tournament_registrations (tournament_id, club_id, status, group_name, points, wins, draws, losses) VALUES
  ('trn_open_2026', 'clb_1', 'CONFIRMED', 'Grupo A', 6, 2, 0, 0),
  ('trn_open_2026', 'clb_2', 'CONFIRMED', 'Grupo A', 3, 1, 0, 1),
  ('trn_open_2026', 'clb_3', 'CONFIRMED', 'Grupo B', 4, 1, 1, 0),
  ('trn_open_2026', 'clb_4', 'CONFIRMED', 'Grupo B', 1, 0, 1, 1);
