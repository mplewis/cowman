package main

import (
	"fmt"
	"os"
	"os/signal"
	"regexp"
	"syscall"

	"github.com/bwmarrin/discordgo"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var (
	matcher *regexp.Regexp
)

func env(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatal().Str("key", key).Msg("Missing mandatory environment variable")
	}
	return val
}

func init() {
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
	if os.Getenv("DEBUG") != "" {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	}
	if os.Getenv("DEVELOPMENT") != "" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout})
	}

	matcher = regexp.MustCompile("(?i)^rename (.+) to (.+)$")
}

func main() {
	token := env("AUTH_TOKEN")
	sess, err := discordgo.New("Bot " + token)
	if err != nil {
		log.Fatal().Err(err).Msg("Error creating session")
	}
	sess.AddHandler(messageCreate)
	err = sess.Open()
	if err != nil {
		log.Fatal().Err(err).Msg("Error connecting to Discord")
	}
	me, err := sess.User("@me")
	if err != nil {
		log.Fatal().Err(err).Msg("Error getting self details")
	}
	log.Info().Str("username", me.Username).Msg("Connected to Discord")

	sc := make(chan os.Signal, 1)
	signal.Notify(sc, syscall.SIGINT, syscall.SIGTERM, os.Interrupt, os.Kill)
	<-sc

	log.Info().Msg("Shutting down")
	sess.Close()
}

func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	resp := respond(s, m)
	if resp == nil {
		return
	}

	log.Info().Str("inUser", m.Author.Username).Str("inMsg", m.Message.Content).Str("message", *resp).Send()
	s.ChannelMessageSend(m.ChannelID, *resp)
}

func respond(s *discordgo.Session, m *discordgo.MessageCreate) *string {
	if m.Author.ID == s.State.User.ID {
		return nil
	}
	match := matcher.FindStringSubmatch(m.Content)
	if match == nil {
		return nil
	}
	newNick := match[2]
	mCount := len(m.Mentions)
	if mCount < 1 {
		return nil
	}
	if mCount > 1 {
		msg := fmt.Sprintf("Error: You mentioned %d users instead of 1", mCount)
		return &msg
	}

	ment := m.Mentions[0]
	log.Debug().Interface("match", match).Str("ment", ment.Username).Send()
	err := s.GuildMemberNickname(m.GuildID, ment.ID, newNick)
	if err != nil {
		log.Error().Err(err).Str("ment", ment.Username).Str("newNick", newNick).Msg("Error renaming user")
		msg := fmt.Sprintf("Error: Could not rename %s to %s: %s", ment.Username, newNick, err.Error())
		return &msg
	}
	ment.Mention()

	msg := fmt.Sprintf("Renamed %s to %s", ment.Username, newNick)
	return &msg
}
