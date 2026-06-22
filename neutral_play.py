import random

def generate_neutral_play(num_boards=5, main_pool=70, mball_pool=25, main_picks=5):
    boards = []
    
    # Statistical constraints for a balanced "neutral" play
    # Sum of the 5 main balls usually falls in the middle bell curve. 
    # For 1-70, avg is 35.5. 5 * 35.5 = 177.5. Let's aim for a sum between 140 and 210.
    min_sum = 140
    max_sum = 210

    while len(boards) < num_boards:
        main_balls = random.sample(range(1, main_pool + 1), main_picks)
        main_balls.sort()
        
        # Check sum constraint
        total_sum = sum(main_balls)
        if not (min_sum <= total_sum <= max_sum):
            continue
            
        # Check Odd/Even balance (aim for 2/3 or 3/2 ratio)
        odds = sum(1 for x in main_balls if x % 2 != 0)
        if odds not in [2, 3]:
            continue
            
        # Check High/Low balance
        midpoint = main_pool / 2
        highs = sum(1 for x in main_balls if x > midpoint)
        if highs not in [2, 3]:
            continue
            
        # Check Decade spread (Ensure numbers cover at least 3 different decades, e.g. 10s, 30s, 50s)
        decades = set((x - 1) // 10 for x in main_balls)
        if len(decades) < 3:
            continue
            
        # Check Consecutive numbers (Avoid more than 2 numbers in a row, or too many pairs)
        consecutive_pairs = 0
        for idx in range(len(main_balls) - 1):
            if main_balls[idx+1] - main_balls[idx] == 1:
                consecutive_pairs += 1
        
        # Max 1 consecutive pair allowed
        if consecutive_pairs > 1:
            continue
            
        # M-Ball generation
        m_ball = random.randint(1, mball_pool)
        
        boards.append({"main": main_balls, "mball": m_ball, "sum": total_sum, "odds": odds, "highs": highs, "decades": len(decades)})
        
    return boards

if __name__ == "__main__":
    print("=== ADVANCED NEUTRAL PLAY BOARDS ===")
    print("Constraints: Sum 140-210, Odd/Even (2:3 or 3:2), High/Low (2:3 or 3:2)")
    print("             Max 1 Consecutive Pair, Spread across >= 3 Decades")
    print("---------------------------------------------------------------------")
    boards = generate_neutral_play(num_boards=5)
    for i, board in enumerate(boards, 1):
        main_str = " ".join(f"{x:02d}" for x in board['main'])
        mball_str = f"{board['mball']:02d}"
        print(f"Board {i}: [ {main_str} ] + ( M-Ball: {mball_str} )")
        print(f"  -> Stats: Sum={board['sum']}, Odds={board['odds']}, Highs={board['highs']}, Decades Covered={board['decades']}\n")
