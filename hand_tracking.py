import mediapipe as mp 
import cv2 

print("************************** START OF PROGRAM ****************************")
print("\n\npress q to quit\n")
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1200)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1200)

hands = mp.solutions.hands
hand = hands.Hands()
drawing = mp.solutions.drawing_utils


fingertips = {
    4: '1',   # Thumb
    8: '2',   # Index
    12: '3',  # Middle
    16: '4',  # Ring
    20: '5'   # Pinky
}



while True:
    success, frame = cap.read()
    if success:
        RGB_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hand.process(RGB_frame)
        
        if result.multi_hand_landmarks:
            for landmark in result.multi_hand_landmarks:
                print(landmark) 
                drawing.draw_landmarks(frame, landmark, hands.HAND_CONNECTIONS)
                
        cv2.imshow("capture image", frame)
        if cv2.waitKey(1)  == ord('q'):
            break
    else:
        print("no sucess ")




cap.release()
cv2.destroyAllWindows()
print("FINISHED")

