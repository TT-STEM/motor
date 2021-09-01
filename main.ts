/**
 * Motor Control for TT Motor Users.
 */
//% weight=11 color=#DF6721 icon="\uf085" block="HC Motor"
//% groups='["Motors", "Servos"]'
namespace motor
{	
    //Constants 
    let PRESCALE_REG = 0xFE //the prescale register address
    let MODE_1_REG = 0x00  //The mode 1 register address
    
    // If you wanted to write some code that stepped through the servos then this is the Base and size to do that 	
    let SERVO_1_REG_BASE = 0x08 
    let SERVO_REG_DISTANCE = 4
    
    //To get the PWM pulses to the correct size and zero offset these are the default numbers. 
    let SERVO_MULTIPLIER = 189 //226 for FS90, 188 for SG90
    let SERVO_ZERO_OFFSET = 0x66

    // List of servos for the servo block to use. These represent register offsets in the PCA9865 driver IC.
    export enum Servos {
        //% block="SV1"
        Servo1 = 0x08,
        //% block="SV2"
        Servo2 = 0x0C,
        //% block="SV3"
        Servo3 = 0x10,
        //% block="SV4"
        Servo4 = 0x14,
        //% block="SV5"
        Servo5 = 0x18,
        //% block="SV6"
        Servo6 = 0x1C,
        //% block="SV7"
        Servo7 = 0x20,
        //% block="SV8"
        Servo8 = 0x24
    }

    // List of motors for the motor blocks to use. These represent register offsets in the PCA9865 driver IC.
    export enum Motors {
        //% block="1"
        Motor1 = 0x28,
        //% block="2"
        Motor2 = 0x30,
        //% block="3"
        Motor3 = 0x38,
        //% block="4"
        Motor4 = 0x40
    }

    // Directions the motors can rotate.
    export enum MotorDirection {
        //% block="CW"
        CW,
	//% block="CCW"
        CCW        
    }

    // The Robotics board can be configured to use different I2C addresses, these are all listed here.
    // Board1 is the default value (set as the CHIP_ADDRESS)
    export enum BoardAddresses{
	Board1 = 0x6C,
        Board2 = 0x6D,
        Board3 = 0x6E,
        Board4 = 0x6F
    }

    // chipAddress can be changed in 'JavaScript' mode if the I2C address of the board has been altered:
    export let chipAddress = BoardAddresses.Board1 
    
    let initalised = false //a flag to allow us to initialise without explicitly calling the secret incantation

    /**
     * Initialise I2C chip
     */
    function I2cInit(): void {
	let buf = pins.createBuffer(2)

	//Should probably do a soft reset of the I2C chip here when I figure out how

	// First set the prescaler to 50 hz
	buf[0] = PRESCALE_REG
	buf[1] = 0x85 //50Hz
	pins.i2cWriteBuffer(chipAddress, buf, false)

	//Block write via the all leds register to turn off all servo and motor outputs
	buf[0] = 0xFA
	buf[1] = 0x00
	pins.i2cWriteBuffer(chipAddress, buf, false)
	buf[0] = 0xFB
	buf[1] = 0x00
	pins.i2cWriteBuffer(chipAddress, buf, false)
	buf[0] = 0xFC
	buf[1] = 0x00
	pins.i2cWriteBuffer(chipAddress, buf, false)
	buf[0] = 0xFD
	buf[1] = 0x00
	pins.i2cWriteBuffer(chipAddress, buf, false)

	//Set the mode 1 register to come out of sleep
	buf[0] = MODE_1_REG
	buf[1] = 0x01
	pins.i2cWriteBuffer(chipAddress, buf, false)

	//set the initalised flag so we dont come in here again automatically
	initalised = true
    }
	
    /**
     * Sets the requested servo to the requested angle.
     */
    //% group=Servos
    //% blockId=motor_setServo
    //% block="Servo|%Servo|degree|%degrees|"
    //% weight=100 blockGap=15
    //% degrees.min=0 degrees.max=180
    export function setServo(servo: Servos, degrees: number): void {
        if (initalised == false) {
            I2cInit()
        }
        let buf = pins.createBuffer(2)
        let highByte = false
        let deg100 = degrees * 100
        let pwmVal100 = deg100 * SERVO_MULTIPLIER
        let pwmVal = pwmVal100 / 10000
        pwmVal = Math.floor(pwmVal)
        pwmVal = pwmVal + SERVO_ZERO_OFFSET
        if (pwmVal > 0xFF) {
            highByte = true
        }
        buf[0] = servo
        buf[1] = pwmVal
        pins.i2cWriteBuffer(chipAddress, buf, false)
        if (highByte) {
            buf[0] = servo + 1
            buf[1] = 0x01
        }
        else {
            buf[0] = servo + 1
            buf[1] = 0x00
        }
        pins.i2cWriteBuffer(chipAddress, buf, false)
    }

    /**
     * Sets the requested motor running in chosen direction at a set speed.
     */
    //% group=Motors
    //% blockId=motor_startMotor
    //% block="Motor|%motor|direction|%dir|speed|%speed|"
    //% weight=100 blockGap=15
    //% speed.min=0 speed.max=100
    export function startMotor(motor: Motors, dir: MotorDirection, speed: number): void {
        if (initalised == false) {
            I2cInit()
        }

        /*convert 0-100 to 0-4095 (approx) We wont worry about the last 95 to make life simpler*/
        let outputVal = Math.clamp(0, 100, speed) * 40;

        let buf = pins.createBuffer(2)
        let highByte = false

        switch (dir) {
            case MotorDirection.CW:
		if (motor == Motors.Motor1 || motor == Motors.Motor3){
		    if (outputVal > 0xFF) {
                	highByte = true
                    }

                    buf[0] = motor
                    buf[1] = outputVal
                    pins.i2cWriteBuffer(chipAddress, buf, false)

                    if (highByte) {
                        buf[0] = motor + 1
                        buf[1] = outputVal/256
                    }
                    else {
                        buf[0] = motor + 1
                        buf[1] = 0x00
                    }
                    pins.i2cWriteBuffer(chipAddress, buf, false)

                    buf[0] = motor + 4
                    buf[1] = 0x00
                    pins.i2cWriteBuffer(chipAddress, buf, false)
                    buf[0] = motor + 5
                    buf[1] = 0x00
                    pins.i2cWriteBuffer(chipAddress, buf, false)
		}
		else{
		    if (outputVal > 0xFF) {
                	highByte = true
                    }
                    buf[0] = motor + 4
                    buf[1] = outputVal
                    pins.i2cWriteBuffer(chipAddress, buf, false)
                    if (highByte) {
                        buf[0] = motor + 5
                        buf[1] = outputVal/256
                    }
                    else {
                        buf[0] = motor + 5
                        buf[1] = 0x00
                    }
                    pins.i2cWriteBuffer(chipAddress, buf, false)

                    buf[0] = motor
                    buf[1] = 0x00
                    pins.i2cWriteBuffer(chipAddress, buf, false)
                    buf[0] = motor + 1
                    buf[1] = 0x00
                    pins.i2cWriteBuffer(chipAddress, buf, false)
		}                
                break
            case MotorDirection.CCW:
                if (motor == Motors.Motor1 || motor == Motors.Motor3){
		    if (outputVal > 0xFF) {
                	highByte = true
                    }
                    buf[0] = motor + 4
                    buf[1] = outputVal
                    pins.i2cWriteBuffer(chipAddress, buf, false)
                    if (highByte) {
                        buf[0] = motor + 5
                        buf[1] = outputVal/256
                    }
                    else {
                        buf[0] = motor + 5
                        buf[1] = 0x00
                    }
                    pins.i2cWriteBuffer(chipAddress, buf, false)

                    buf[0] = motor
                    buf[1] = 0x00
                    pins.i2cWriteBuffer(chipAddress, buf, false)
                    buf[0] = motor + 1
                    buf[1] = 0x00
                    pins.i2cWriteBuffer(chipAddress, buf, false)
		}
		else{
		    if (outputVal > 0xFF) {
                	highByte = true
                    }

                    buf[0] = motor
                    buf[1] = outputVal
                    pins.i2cWriteBuffer(chipAddress, buf, false)

                    if (highByte) {
                        buf[0] = motor + 1
                        buf[1] = outputVal/256
                    }
                    else {
                        buf[0] = motor + 1
                        buf[1] = 0x00
                    }
                    pins.i2cWriteBuffer(chipAddress, buf, false)

                    buf[0] = motor + 4
                    buf[1] = 0x00
                    pins.i2cWriteBuffer(chipAddress, buf, false)
                    buf[0] = motor + 5
                    buf[1] = 0x00
                    pins.i2cWriteBuffer(chipAddress, buf, false)
		}                
                break
        }            
    }   

    /**
     * Turns off specified motor.     
     */
    //% group=Motors
    //% blockId=motor_stopMotor
    //% weight=99 blockGap=15
    //%block="Motor|%motor|Stop"
    export function stopMotor(motor: Motors): void {

    	let buf = pins.createBuffer(2)

        buf[0] = motor
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
        buf[0] = motor + 1
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
        buf[0] = motor + 4
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
        buf[0] = motor + 5
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
    }

    /**
     * Turns off all motors.
     */
    //% group=Motors
    //% blockId=motor_stopAllMotors
    //% weight=98 blockGap=15
    //%block="Motor Stop All"
    export function stopAllMotors(): void {       
        stopMotor(Motors.Motor1)
        stopMotor(Motors.Motor2)
        stopMotor(Motors.Motor3)
        stopMotor(Motors.Motor4)
    }
    
    /**
     * Turns off specified servo.     
     */
    //% group=Servos
    //% blockId=motor_stopServo
    //% weight=99 blockGap=15
    //%block="Servo|%servo|Stop"
    export function stopServo(servo: Servos): void {
	let buf = pins.createBuffer(2)
        
        buf[0] = servo
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
        buf[0] = servo + 1
        buf[1] = 0x00
        pins.i2cWriteBuffer(chipAddress, buf, false)
    }
    
    /**
     * Turns off all servos.
     */
    //% group=Servos
    //% blockId=motor_stopAllServos
    //% weight=98 blockGap=15
    //%block="Servo Stop All"
    export function stopAllServos(): void {
        let buf = pins.createBuffer(2)
        let servoOffCount = 0
        let servoStartReg = Servos.Servo1
        let servoRegCount = 0

        while (servoOffCount < 8) {
            buf[0] = servoStartReg + servoRegCount
            buf[1] = 0x00
            pins.i2cWriteBuffer(chipAddress, buf, false)
            buf[0] = servoStartReg + servoRegCount + 1
            buf[1] = 0x00
            pins.i2cWriteBuffer(chipAddress, buf, false)

            servoRegCount += 4
            servoOffCount += 1
        }
    }
}
