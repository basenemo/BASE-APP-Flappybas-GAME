"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Play, RotateCcw, Trophy, Star, Calendar, Gift, Target, Users, Medal, Share2, UserPlus } from "lucide-react"
import { sdk } from "@farcaster/miniapp-sdk"

interface Bird {
  x: number
  y: number
  velocity: number
}

interface Pipe {
  x: number
  topHeight: number
  bottomY: number
  passed: boolean
}

interface PlayerStats {
  xp: number
  level: number
  dailyStreak: number
  lastCheckIn: string
  totalGames: number
  weeklyTasksCompleted: number
  weekStartDate: string
  weeklyStats: {
    totalScore: number
    gamesPlayed: number
    pipesCleared: number
    maxStreak: number
  }
  friendsInvited: number
  referralCode: string
}

interface DailyCheckIn {
  date: string
  claimed: boolean
  reward: number
}

interface WeeklyTask {
  id: string
  title: string
  description: string
  target: number
  progress: number
  reward: number
  completed: boolean
  type: "score" | "games" | "pipes" | "streak"
}

interface LeaderboardEntry {
  id: string
  playerName: string
  score: number
  level: number
  timestamp: number
}

interface SocialStats {
  totalPlayers: number
  averageScore: number
  topScore: number
  playerRank: number
}

interface Friend {
  id: string
  name: string
  level: number
  lastActive: number
  bestScore: number
  invitedBy?: string
}

const GAME_CONFIG = {
  BIRD_SIZE: 30,
  PIPE_WIDTH: 60,
  PIPE_GAP: 150,
  GRAVITY: 0.4, // Reduced from 0.6
  JUMP_FORCE: -8, // Reduced from -12
  PIPE_SPEED: 3,
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 600,
}

const XP_CONFIG = {
  BASE_XP_PER_LEVEL: 100,
  XP_PER_SCORE: 10,
  XP_DAILY_CHECKIN: 50,
  XP_WEEKLY_TASK: 100,
  XP_FRIEND_INVITE: 200,
  XP_FRIEND_MILESTONE: 100,
  DAILY_CHECKIN_BONUS: [50, 75, 100, 150, 200, 300, 500], // XP for consecutive days
}

const generateReferralCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const generateWeeklyTasks = (): WeeklyTask[] => {
  return [
    {
      id: "score_challenge",
      title: "Score Master",
      description: "Achieve a total score of 100 points this week",
      target: 100,
      progress: 0,
      reward: 200,
      completed: false,
      type: "score",
    },
    {
      id: "games_challenge",
      title: "Dedicated Player",
      description: "Play 20 games this week",
      target: 20,
      progress: 0,
      reward: 150,
      completed: false,
      type: "games",
    },
    {
      id: "pipes_challenge",
      title: "Pipe Navigator",
      description: "Clear 50 pipes this week",
      target: 50,
      progress: 0,
      reward: 250,
      completed: false,
      type: "pipes",
    },
    {
      id: "streak_challenge",
      title: "Consistency King",
      description: "Maintain a 5-day check-in streak",
      target: 5,
      progress: 0,
      reward: 300,
      completed: false,
      type: "streak",
    },
  ]
}

const generateMockLeaderboard = (): LeaderboardEntry[] => {
  const mockNames = [
    "FlappyMaster",
    "BirdWhisperer",
    "PipeNavigator",
    "SkyDancer",
    "WingCommander",
    "AerialAce",
    "FlightPro",
    "CloudSurfer",
    "FeatherFly",
    "SoaringStar",
    "BirdBrain",
    "FlappyKing",
    "AirborneHero",
    "WingedWarrior",
    "FlightPath",
  ]

  return mockNames
    .map((name, index) => ({
      id: `player_${index}`,
      playerName: name,
      score: Math.floor(Math.random() * 50) + 10,
      level: Math.floor(Math.random() * 20) + 1,
      timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    }))
    .sort((a, b) => b.score - a.score)
}

export default function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [bird, setBird] = useState<Bird>({
    x: 100,
    y: GAME_CONFIG.CANVAS_HEIGHT / 2,
    velocity: 0,
  })
  const [pipes, setPipes] = useState<Pipe[]>([])

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    xp: 0,
    level: 1,
    dailyStreak: 0,
    lastCheckIn: "",
    totalGames: 0,
    weeklyTasksCompleted: 0,
    weekStartDate: "",
    weeklyStats: {
      totalScore: 0,
      gamesPlayed: 0,
      pipesCleared: 0,
      maxStreak: 0,
    },
    friendsInvited: 0,
    referralCode: "",
  })

  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([])
  const [showWeeklyTasks, setShowWeeklyTasks] = useState(false)
  const [taskReward, setTaskReward] = useState<WeeklyTask | null>(null)
  const [dailyReward, setDailyReward] = useState<number | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [playerName, setPlayerName] = useState("")
  const [socialStats, setSocialStats] = useState<SocialStats>({
    totalPlayers: 1247,
    averageScore: 12,
    topScore: 89,
    playerRank: 156,
  })

  const [showFriends, setShowFriends] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [inviteCode, setInviteCode] = useState("")
  const [showInviteReward, setShowInviteReward] = useState(false)

  const calculateLevel = (xp: number): number => {
    return Math.floor(xp / XP_CONFIG.BASE_XP_PER_LEVEL) + 1
  }

  const getXPForNextLevel = (currentXP: number): number => {
    const currentLevel = calculateLevel(currentXP)
    return currentLevel * XP_CONFIG.BASE_XP_PER_LEVEL
  }

  const canCheckInToday = (): boolean => {
    const today = new Date().toDateString()
    return playerStats.lastCheckIn !== today
  }

  const isNewWeek = (): boolean => {
    const today = new Date()
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
    const savedWeekStart = playerStats.weekStartDate

    return !savedWeekStart || new Date(savedWeekStart).getTime() !== weekStart.getTime()
  }

  const initializeWeeklyTasks = () => {
    if (isNewWeek()) {
      const newTasks = generateWeeklyTasks()
      const today = new Date()
      const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())

      setWeeklyTasks(newTasks)
      setPlayerStats((prev) => ({
        ...prev,
        weekStartDate: weekStart.toISOString(),
        weeklyTasksCompleted: 0,
        weeklyStats: {
          totalScore: 0,
          gamesPlayed: 0,
          pipesCleared: 0,
          maxStreak: prev.dailyStreak,
        },
      }))

      localStorage.setItem("flappyBirdWeeklyTasks", JSON.stringify(newTasks))
    } else {
      const savedTasks = localStorage.getItem("flappyBirdWeeklyTasks")
      if (savedTasks) {
        setWeeklyTasks(JSON.parse(savedTasks))
      } else {
        const newTasks = generateWeeklyTasks()
        setWeeklyTasks(newTasks)
        localStorage.setItem("flappyBirdWeeklyTasks", JSON.stringify(newTasks))
      }
    }
  }

  const updateWeeklyTaskProgress = (taskType: string, value: number) => {
    setWeeklyTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) => {
        if (task.type === taskType && !task.completed) {
          const newProgress = Math.min(task.progress + value, task.target)
          const isCompleted = newProgress >= task.target

          if (isCompleted && !task.completed) {
            // Award XP for completing task
            setPlayerStats((prev) => {
              const newXP = prev.xp + task.reward
              const newStats = {
                ...prev,
                xp: newXP,
                level: calculateLevel(newXP),
                weeklyTasksCompleted: prev.weeklyTasksCompleted + 1,
              }
              localStorage.setItem("flappyBirdPlayerStats", JSON.stringify(newStats))
              return newStats
            })

            setTaskReward(task)
          }

          return { ...task, progress: newProgress, completed: isCompleted }
        }
        return task
      })

      localStorage.setItem("flappyBirdWeeklyTasks", JSON.stringify(updatedTasks))
      return updatedTasks
    })
  }

  const handleDailyCheckIn = () => {
    if (!canCheckInToday()) return

    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()

    let newStreak = 1
    if (playerStats.lastCheckIn === yesterday) {
      newStreak = playerStats.dailyStreak + 1
    }

    const streakIndex = Math.min(newStreak - 1, XP_CONFIG.DAILY_CHECKIN_BONUS.length - 1)
    const reward = XP_CONFIG.DAILY_CHECKIN_BONUS[streakIndex]

    const newXP = playerStats.xp + reward
    const newStats = {
      ...playerStats,
      xp: newXP,
      level: calculateLevel(newXP),
      dailyStreak: newStreak,
      lastCheckIn: today,
      weeklyStats: {
        ...playerStats.weeklyStats,
        maxStreak: Math.max(playerStats.weeklyStats.maxStreak, newStreak),
      },
    }

    setPlayerStats(newStats)
    setDailyReward(reward)
    setShowWeeklyTasks(true)

    updateWeeklyTaskProgress("streak", newStreak)

    // Save to localStorage
    localStorage.setItem("flappyBirdPlayerStats", JSON.stringify(newStats))
  }

  const submitScore = (score: number) => {
    if (!playerName.trim()) return

    const newEntry: LeaderboardEntry = {
      id: `player_${Date.now()}`,
      playerName: playerName.trim(),
      score: score,
      level: playerStats.level,
      timestamp: Date.now(),
    }

    const updatedLeaderboard = [...leaderboard, newEntry].sort((a, b) => b.score - a.score).slice(0, 50) // Keep top 50

    setLeaderboard(updatedLeaderboard)
    localStorage.setItem("flappyBirdLeaderboard", JSON.stringify(updatedLeaderboard))

    // Update player rank
    const playerRank = updatedLeaderboard.findIndex((entry) => entry.id === newEntry.id) + 1
    setSocialStats((prev) => ({ ...prev, playerRank }))
  }

  const shareScore = async () => {
    const shareText = `I just scored ${score} points in Flappy Bird! Can you beat my score? 🐦`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Flappy Bird Score",
          text: shareText,
          url: window.location.href,
        })
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText} ${window.location.href}`)
        alert("Score copied to clipboard!")
      } catch (err) {
        console.log("Error copying to clipboard:", err)
      }
    }
  }

  const generateInviteLink = (): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    return `${baseUrl}?ref=${playerStats.referralCode}`
  }

  const handleInviteFriend = async () => {
    const inviteLink = generateInviteLink()
    const inviteText = `Join me in Flappy Bird! Use my referral code ${playerStats.referralCode} and we both get bonus XP! 🐦`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Flappy Bird!",
          text: inviteText,
          url: inviteLink,
        })
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${inviteText} ${inviteLink}`)
        alert("Invite link copied to clipboard!")
      } catch (err) {
        console.log("Error copying to clipboard:", err)
      }
    }
  }

  const handleUseInviteCode = () => {
    if (!inviteCode.trim() || inviteCode === playerStats.referralCode) return

    // Simulate accepting invite
    const newFriend: Friend = {
      id: `friend_${Date.now()}`,
      name: `Player_${inviteCode}`,
      level: Math.floor(Math.random() * 10) + 1,
      lastActive: Date.now(),
      bestScore: Math.floor(Math.random() * 30) + 5,
      invitedBy: inviteCode,
    }

    const updatedFriends = [...friends, newFriend]
    setFriends(updatedFriends)
    localStorage.setItem("flappyBirdFriends", JSON.stringify(updatedFriends))

    // Award XP for using invite code
    const newXP = playerStats.xp + XP_CONFIG.XP_FRIEND_INVITE
    const newStats = {
      ...playerStats,
      xp: newXP,
      level: calculateLevel(newXP),
    }

    setPlayerStats(newStats)
    localStorage.setItem("flappyBirdPlayerStats", JSON.stringify(newStats))

    setShowInviteReward(true)
    setInviteCode("")
  }

  const checkReferralCode = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const refCode = urlParams.get("ref")

      if (refCode && refCode !== playerStats.referralCode) {
        setInviteCode(refCode)
      }
    }
  }

  const awardGameXP = useCallback(() => {
    const xpGained = score * XP_CONFIG.XP_PER_SCORE
    const newXP = playerStats.xp + xpGained
    const newStats = {
      ...playerStats,
      xp: newXP,
      level: calculateLevel(newXP),
      totalGames: playerStats.totalGames + 1,
      weeklyStats: {
        ...playerStats.weeklyStats,
        totalScore: playerStats.weeklyStats.totalScore + score,
        gamesPlayed: playerStats.weeklyStats.gamesPlayed + 1,
        pipesCleared: playerStats.weeklyStats.pipesCleared + score,
      },
    }

    setPlayerStats(newStats)
    localStorage.setItem("flappyBirdPlayerStats", JSON.stringify(newStats))

    updateWeeklyTaskProgress("score", score)
    updateWeeklyTaskProgress("games", 1)
    updateWeeklyTaskProgress("pipes", score)

    // Submit score to leaderboard if player has a name
    if (playerName.trim() && score > 0) {
      submitScore(score)
    }
  }, [score, playerStats, playerName])

  const resetGame = useCallback(() => {
    setBird({
      x: 100,
      y: GAME_CONFIG.CANVAS_HEIGHT / 2,
      velocity: 0,
    })
    setPipes([])
    setScore(0)
  }, [])

  const startGame = useCallback(() => {
    resetGame()
    setGameState("playing")
  }, [resetGame])

  const jump = useCallback(() => {
    if (gameState === "playing") {
      setBird((prev) => ({
        ...prev,
        velocity: GAME_CONFIG.JUMP_FORCE,
      }))
    }
  }, [gameState])

  const generatePipe = useCallback((): Pipe => {
    const topHeight = Math.random() * (GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PIPE_GAP - 100) + 50
    return {
      x: GAME_CONFIG.CANVAS_WIDTH,
      topHeight,
      bottomY: topHeight + GAME_CONFIG.PIPE_GAP,
      passed: false,
    }
  }, [])

  const checkCollision = useCallback((bird: Bird, pipes: Pipe[]): boolean => {
    // Check ground and ceiling collision
    if (bird.y <= 0 || bird.y >= GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.BIRD_SIZE) {
      return true
    }

    // Check pipe collision
    for (const pipe of pipes) {
      if (
        bird.x < pipe.x + GAME_CONFIG.PIPE_WIDTH &&
        bird.x + GAME_CONFIG.BIRD_SIZE > pipe.x &&
        (bird.y < pipe.topHeight || bird.y + GAME_CONFIG.BIRD_SIZE > pipe.bottomY)
      ) {
        return true
      }
    }

    return false
  }, [])

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return

    const gameLoop = () => {
      setBird((prev) => {
        const newBird = {
          ...prev,
          y: prev.y + prev.velocity,
          velocity: prev.velocity + GAME_CONFIG.GRAVITY,
        }

        setPipes((prevPipes) => {
          let newPipes = prevPipes.map((pipe) => ({
            ...pipe,
            x: pipe.x - GAME_CONFIG.PIPE_SPEED,
          }))

          // Remove pipes that are off screen
          newPipes = newPipes.filter((pipe) => pipe.x > -GAME_CONFIG.PIPE_WIDTH)

          // Add new pipe if needed
          if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < GAME_CONFIG.CANVAS_WIDTH - 200) {
            newPipes.push(generatePipe())
          }

          // Check for score
          newPipes.forEach((pipe) => {
            if (!pipe.passed && pipe.x + GAME_CONFIG.PIPE_WIDTH < newBird.x) {
              pipe.passed = true
              setScore((prev) => prev + 1)
            }
          })

          // Check collision
          if (checkCollision(newBird, newPipes)) {
            setGameState("gameOver")
            setTimeout(() => awardGameXP(), 100)
          }

          return newPipes
        })

        return newBird
      })

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, generatePipe, checkCollision, awardGameXP])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)

    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.CANVAS_HEIGHT)
    gradient.addColorStop(0, "#87CEEB")
    gradient.addColorStop(1, "#98D8E8")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)

    // Draw pipes
    ctx.fillStyle = "#228B22"
    pipes.forEach((pipe) => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, GAME_CONFIG.PIPE_WIDTH, pipe.topHeight)
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, GAME_CONFIG.PIPE_WIDTH, GAME_CONFIG.CANVAS_HEIGHT - pipe.bottomY)

      // Pipe caps
      ctx.fillStyle = "#32CD32"
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, GAME_CONFIG.PIPE_WIDTH + 10, 20)
      ctx.fillRect(pipe.x - 5, pipe.bottomY, GAME_CONFIG.PIPE_WIDTH + 10, 20)
      ctx.fillStyle = "#228B22"
    })

    // Draw bird
    ctx.fillStyle = "#FFD700"
    ctx.beginPath()
    ctx.arc(
      bird.x + GAME_CONFIG.BIRD_SIZE / 2,
      bird.y + GAME_CONFIG.BIRD_SIZE / 2,
      GAME_CONFIG.BIRD_SIZE / 2,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    // Bird details
    ctx.fillStyle = "#FF6347"
    ctx.beginPath()
    ctx.arc(bird.x + GAME_CONFIG.BIRD_SIZE / 2 + 8, bird.y + GAME_CONFIG.BIRD_SIZE / 2, 4, 0, Math.PI * 2)
    ctx.fill()

    // Eye
    ctx.fillStyle = "#000"
    ctx.beginPath()
    ctx.arc(bird.x + GAME_CONFIG.BIRD_SIZE / 2 + 5, bird.y + GAME_CONFIG.BIRD_SIZE / 2 - 5, 3, 0, Math.PI * 2)
    ctx.fill()

    // Ground
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(0, GAME_CONFIG.CANVAS_HEIGHT - 20, GAME_CONFIG.CANVAS_WIDTH, 20)
  }, [bird, pipes])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        if (gameState === "menu" || gameState === "gameOver") {
          startGame()
        } else {
          jump()
        }
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [gameState, startGame, jump])

  // Load player stats, leaderboard, friends, and initialize weekly tasks
  useEffect(() => {
    const savedHighScore = localStorage.getItem("flappyBirdHighScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }

    const savedStats = localStorage.getItem("flappyBirdPlayerStats")
    if (savedStats) {
      const stats = JSON.parse(savedStats)
      if (!stats.referralCode) {
        stats.referralCode = generateReferralCode()
        stats.friendsInvited = 0
      }
      setPlayerStats(stats)
    } else {
      const newStats = {
        ...playerStats,
        referralCode: generateReferralCode(),
      }
      setPlayerStats(newStats)
    }

    const savedLeaderboard = localStorage.getItem("flappyBirdLeaderboard")
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard))
    } else {
      const mockLeaderboard = generateMockLeaderboard()
      setLeaderboard(mockLeaderboard)
      localStorage.setItem("flappyBirdLeaderboard", JSON.stringify(mockLeaderboard))
    }

    const savedPlayerName = localStorage.getItem("flappyBirdPlayerName")
    if (savedPlayerName) {
      setPlayerName(savedPlayerName)
    }

    const savedFriends = localStorage.getItem("flappyBirdFriends")
    if (savedFriends) {
      setFriends(JSON.parse(savedFriends))
    }

    initializeWeeklyTasks()
    checkReferralCode()
  }, [])

  // Base mini app initialization
  useEffect(() => {
    const initializeMiniApp = async () => {
      try {
        // Call ready() to hide loading splash and display the app
        await sdk.actions.ready()
        console.log("[v0] Base mini app initialized successfully")
      } catch (error) {
        console.log("[v0] Base mini app initialization failed:", error)
        // App will still work without Base integration
      }
    }

    initializeMiniApp()
  }, [])

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">Level {playerStats.level}</div>
              <div className="text-sm text-gray-600">
                {playerStats.xp} / {getXPForNextLevel(playerStats.xp)} XP
              </div>
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((playerStats.xp % XP_CONFIG.BASE_XP_PER_LEVEL) / XP_CONFIG.BASE_XP_PER_LEVEL) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="text-center">
              <div className="flex items-center gap-1 text-orange-600">
                <Calendar className="w-4 h-4" />
                <span className="font-bold">{playerStats.dailyStreak}</span>
              </div>
              <div className="text-xs text-gray-600">Day Streak</div>
            </div>
            <Button
              onClick={() => setShowFriends(true)}
              size="sm"
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <Users className="w-4 h-4 mr-1" />
              Friends ({friends.length})
            </Button>
            <Button
              onClick={() => setShowLeaderboard(true)}
              size="sm"
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <Trophy className="w-4 h-4 mr-1" />
              Rank #{socialStats.playerRank}
            </Button>
            <Button
              onClick={() => setShowWeeklyTasks(true)}
              size="sm"
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Target className="w-4 h-4 mr-1" />
              Tasks ({weeklyTasks.filter((t) => t.completed).length}/{weeklyTasks.length})
            </Button>
            {canCheckInToday() && (
              <Button
                onClick={handleDailyCheckIn}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Gift className="w-4 h-4 mr-1" />
                Check In
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="font-bold text-orange-600">{socialStats.totalPlayers.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Total Players</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-red-600">{socialStats.averageScore}</div>
              <div className="text-xs text-gray-600">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-600">{socialStats.topScore}</div>
              <div className="text-xs text-gray-600">World Record</div>
            </div>
          </div>
          <div className="flex gap-2">
            {score > 0 && gameState === "gameOver" && (
              <Button
                onClick={shareScore}
                size="sm"
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50 bg-transparent"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-2xl">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Flappy Bird</h1>
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Score: {score}</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-orange-500" />
              <span>Best: {highScore}</span>
            </div>
          </div>
        </div>

        {!playerName.trim() && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 mb-2">Enter your name to join the leaderboard:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="flex-1 px-3 py-1 border rounded text-sm"
                maxLength={20}
              />
              <Button
                onClick={() => {
                  if (playerName.trim()) {
                    localStorage.setItem("flappyBirdPlayerName", playerName.trim())
                  }
                }}
                size="sm"
                disabled={!playerName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={GAME_CONFIG.CANVAS_WIDTH}
            height={GAME_CONFIG.CANVAS_HEIGHT}
            className="border-2 border-gray-300 rounded-lg cursor-pointer"
            onClick={gameState === "playing" ? jump : startGame}
          />

          {gameState === "menu" && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center text-white">
              <h2 className="text-2xl font-bold mb-4">Ready to Fly?</h2>
              <p className="text-center mb-6 px-4">
                Tap or press SPACE to make the bird fly.
                <br />
                Avoid the pipes and try to get the highest score!
                <br />
                <span className="text-yellow-400">Earn {XP_CONFIG.XP_PER_SCORE} XP per point!</span>
              </p>
              <Button onClick={startGame} size="lg" className="bg-green-600 hover:bg-green-700">
                <Play className="w-5 h-5 mr-2" />
                Start Game
              </Button>
            </div>
          )}

          {gameState === "gameOver" && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center text-white">
              <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
              <p className="text-lg mb-2">Final Score: {score}</p>
              <p className="text-green-400 mb-2">+{score * XP_CONFIG.XP_PER_SCORE} XP Earned!</p>
              {score === highScore && score > 0 && <p className="text-yellow-400 mb-4">New High Score!</p>}
              <div className="flex gap-2">
                <Button onClick={startGame} size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Play Again
                </Button>
                {score > 0 && (
                  <Button
                    onClick={() => setShowLeaderboard(true)}
                    size="lg"
                    variant="outline"
                    className="text-white border-white hover:bg-white/20"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    Leaderboard
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Click the game area or press SPACE to play</p>
          <p>Navigate through the pipes without touching them!</p>
        </div>
      </Card>

      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-orange-500" />
                  Leaderboard
                </h3>
                <Button onClick={() => setShowLeaderboard(false)} variant="ghost" size="sm">
                  ✕
                </Button>
              </div>

              <div className="space-y-2 mb-4">
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      entry.playerName === playerName ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? "bg-yellow-500 text-white"
                            : index === 1
                              ? "bg-gray-400 text-white"
                              : index === 2
                                ? "bg-orange-600 text-white"
                                : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {index < 3 ? <Medal className="w-4 h-4" /> : index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{entry.playerName}</div>
                        <div className="text-xs text-gray-500">Level {entry.level}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.score}</div>
                      <div className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Global Stats
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Your Rank</div>
                    <div className="font-bold text-purple-600">#{socialStats.playerRank}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Total Players</div>
                    <div className="font-bold text-blue-600">{socialStats.totalPlayers.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Average Score</div>
                    <div className="font-bold text-green-600">{socialStats.averageScore}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">World Record</div>
                    <div className="font-bold text-red-600">{socialStats.topScore}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showWeeklyTasks && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Weekly Tasks</h3>
                <Button onClick={() => setShowWeeklyTasks(false)} variant="ghost" size="sm">
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                {weeklyTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-800">{task.title}</h4>
                        <p className="text-sm text-gray-600">{task.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">+{task.reward} XP</div>
                        {task.completed && <div className="text-xs text-green-500">✓ Complete</div>}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>
                          {task.progress} / {task.target}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            task.completed ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">This Week's Stats</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Total Score</div>
                    <div className="font-bold">{playerStats.weeklyStats.totalScore}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Games Played</div>
                    <div className="font-bold">{playerStats.weeklyStats.gamesPlayed}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Pipes Cleared</div>
                    <div className="font-bold">{playerStats.weeklyStats.pipesCleared}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Max Streak</div>
                    <div className="font-bold">{playerStats.weeklyStats.maxStreak}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showFriends && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  Friends ({friends.length})
                </h3>
                <Button onClick={() => setShowFriends(false)} variant="ghost" size="sm">
                  ✕
                </Button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Invite Friends
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Share your referral code and earn {XP_CONFIG.XP_FRIEND_INVITE} XP when friends join!
                  </p>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 p-2 bg-white rounded border text-center font-mono font-bold">
                      {playerStats.referralCode}
                    </div>
                    <Button onClick={handleInviteFriend} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-600 mb-2">Have a friend's code?</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-1 border rounded text-sm"
                        maxLength={6}
                      />
                      <Button
                        onClick={handleUseInviteCode}
                        size="sm"
                        disabled={!inviteCode.trim() || inviteCode === playerStats.referralCode}
                      >
                        Use Code
                      </Button>
                    </div>
                  </div>
                </div>

                {friends.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Your Friends</h4>
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {friend.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{friend.name}</div>
                              <div className="text-xs text-gray-500">Level {friend.level}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{friend.bestScore}</div>
                            <div className="text-xs text-gray-500">Best Score</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold mb-2 text-yellow-800">Friend Rewards</h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <div>• Invite a friend: +{XP_CONFIG.XP_FRIEND_INVITE} XP</div>
                    <div>• Friend reaches Level 5: +{XP_CONFIG.XP_FRIEND_MILESTONE} XP</div>
                    <div>• Friend reaches Level 10: +{XP_CONFIG.XP_FRIEND_MILESTONE * 2} XP</div>
                    <div>• Compare scores on leaderboard</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showInviteReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 bg-white max-w-sm mx-4">
            <div className="text-center">
              <UserPlus className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Welcome Bonus!</h3>
              <p className="text-gray-600 mb-2">Thanks for joining through a friend!</p>
              <div className="text-3xl font-bold text-green-600 mb-4">+{XP_CONFIG.XP_FRIEND_INVITE} XP</div>
              <Button onClick={() => setShowInviteReward(false)} className="w-full">
                Claim Reward
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
